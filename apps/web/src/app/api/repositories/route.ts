import { withAuth } from "@/utils/middleware";
import { db } from "@/db";
import { repositories, pullRequests, repoAgents, users } from "@/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { NextResponse } from "next/server";

export type RepositoryResponse = Awaited<ReturnType<typeof getRepositories>>;

async function getRepositories(userId: string) {
  const user = await db
    .select({ defaultGhOrganizationId: users.defaultGhOrganizationId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user[0]?.defaultGhOrganizationId) {
    throw new Error("No default organization set");
  }

  const orgId = user[0].defaultGhOrganizationId;

  // Get repositories with aggregated stats
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
    })
    .from(repositories)
    .where(eq(repositories.ownerGhOrganizationId, orgId))
    .orderBy(desc(repositories.updatedAt));

  // Get stats for each repo
  const reposWithStats = await Promise.all(
    repos.map(async (repo) => {
      // Count open PRs
      const openPRsResult = await db
        .select({ count: count() })
        .from(pullRequests)
        .where(
          and(eq(pullRequests.repoId, repo.id), eq(pullRequests.state, "open"))
        );

      // Count active agents
      const activeAgentsResult = await db
        .select({ count: count() })
        .from(repoAgents)
        .where(
          and(eq(repoAgents.repoId, repo.id), eq(repoAgents.enabled, true))
        );

      return {
        ...repo,
        openPRs: openPRsResult[0]?.count || 0,
        activeAgents: activeAgentsResult[0]?.count || 0,
      };
    })
  );

  return reposWithStats;
}

export const GET = withAuth(async (request) => {
  const userId = request.auth.userId;

  const repositories = await getRepositories(userId);

  return NextResponse.json(repositories);
});
