import { withAuth } from "@/utils/middleware";
import { db } from "@/db";
import { repositories, users } from "@/db/schema";
import { eq, and, desc, count, ilike, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

const DEFAULT_PAGE_SIZE = 25;

export type RepositoryResponse = Awaited<ReturnType<typeof getRepositories>>;

async function getRepositories(
  userId: string,
  options: { page: number; limit: number; search?: string }
) {
  const { page, limit, search } = options;
  const offset = (page - 1) * limit;

  const user = await db
    .select({ defaultGhOrganizationId: users.defaultGhOrganizationId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user[0]?.defaultGhOrganizationId) {
    throw new Error("No default organization set");
  }

  const orgId = user[0].defaultGhOrganizationId;

  // Build where conditions
  const whereConditions = search
    ? and(
        eq(repositories.ownerGhOrganizationId, orgId),
        ilike(repositories.name, `%${search}%`)
      )
    : eq(repositories.ownerGhOrganizationId, orgId);

  // Get total count for pagination
  const totalResult = await db
    .select({ count: count() })
    .from(repositories)
    .where(whereConditions);

  const total = totalResult[0]?.count || 0;

  // Get repositories with aggregated stats using subqueries (single query, no N+1)
  const repos = await db
    .select({
      id: repositories.id,
      name: repositories.name,
      fullName: repositories.fullName,
      description: repositories.description,
      htmlUrl: repositories.htmlUrl,
      defaultBranch: repositories.defaultBranch,
      private: repositories.private,
      updatedAt: repositories.updatedAt,
      openPRs: sql<number>`(
        SELECT COUNT(*)::int FROM pull_requests 
        WHERE pull_requests.repo_id = ${repositories.id} 
        AND pull_requests.state = 'open'
      )`.as("open_prs"),
      activeAgents: sql<number>`(
        SELECT COUNT(*)::int FROM repo_agents 
        WHERE repo_agents.repo_id = ${repositories.id} 
        AND repo_agents.enabled = true
      )`.as("active_agents"),
    })
    .from(repositories)
    .where(whereConditions)
    .orderBy(desc(repositories.updatedAt))
    .limit(limit)
    .offset(offset);

  return {
    data: repos,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export const GET = withAuth(async (request) => {
  const userId = request.auth.userId;
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    100,
    Math.max(
      1,
      parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10)
    )
  );
  const search = searchParams.get("search") || undefined;

  const result = await getRepositories(userId, { page, limit, search });

  return NextResponse.json(result);
});
