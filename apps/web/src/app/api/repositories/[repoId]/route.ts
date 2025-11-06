import { repositories, users } from "@/db/schema";
import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { withAuth } from "@/utils/middleware";

/**
 * Get a single repository with detailed information
 */
export async function getRepository(userId: string, repoId: string) {
  const user = await db
    .select({ defaultGhOrganizationId: users.defaultGhOrganizationId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user[0]?.defaultGhOrganizationId) {
    throw new Error("No default organization set");
  }

  const orgId = user[0].defaultGhOrganizationId;

  const repo = await db
    .select()
    .from(repositories)
    .where(
      and(
        eq(repositories.id, repoId),
        eq(repositories.ownerGhOrganizationId, orgId)
      )
    )
    .limit(1);

  if (!repo[0]) {
    throw new Error("Repository not found");
  }

  return repo[0];
}

export type GetRepositoryResponse = Awaited<ReturnType<typeof getRepository>>;

export const GET = withAuth(async (request, { params }) => {
  const userId = request.auth.userId;
  const { repoId } = await params;

  if (!repoId) {
    return NextResponse.json(
      { error: "Repository ID is required" },
      { status: 400 }
    );
  }

  const repository = await getRepository(userId, repoId);

  return NextResponse.json(repository);
});
