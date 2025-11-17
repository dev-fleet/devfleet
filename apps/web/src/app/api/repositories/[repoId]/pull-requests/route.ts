import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { withAuth } from "@/utils/middleware";
import { db } from "@/db";
import {
  agents,
  prCheckRuns,
  pullRequests,
  repositories,
  users,
} from "@/db/schema";

async function getRepository(userId: string, repoId: string) {
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

async function getRepositoryPullRequests(userId: string, repoId: string) {
  await getRepository(userId, repoId);

  const prs = await db
    .select({
      id: pullRequests.id,
      prNumber: pullRequests.prNumber,
      title: pullRequests.title,
      description: pullRequests.description,
      authorLogin: pullRequests.authorLogin,
      state: pullRequests.state,
      draft: pullRequests.draft,
      htmlUrl: pullRequests.htmlUrl,
      labels: pullRequests.labels,
      assignees: pullRequests.assignees,
      requestedReviewers: pullRequests.requestedReviewers,
      mergedAt: pullRequests.mergedAt,
      closedAt: pullRequests.closedAt,
      mergedBy: pullRequests.mergedBy,
      firstReviewAt: pullRequests.firstReviewAt,
      approvalStatus: pullRequests.approvalStatus,
      reviewCount: pullRequests.reviewCount,
      updatedAt: pullRequests.updatedAt,
      createdAt: pullRequests.createdAt,
    })
    .from(pullRequests)
    .where(eq(pullRequests.repoId, repoId))
    .orderBy(desc(pullRequests.updatedAt))
    .limit(50);

  const prsWithStats = await Promise.all(
    prs.map(async (pr) => {
      const checkRuns = await db
        .select({
          status: prCheckRuns.status,
          agentId: prCheckRuns.agentId,
          agentName: agents.name,
        })
        .from(prCheckRuns)
        .innerJoin(agents, eq(prCheckRuns.agentId, agents.id))
        .where(eq(prCheckRuns.prId, pr.id));

      const failingAgents = checkRuns
        .filter((run) => run.status === "fail" || run.status === "error")
        .map((run) => run.agentName);

      const allPassed = checkRuns.every((run) => run.status === "pass");
      const someFailed = checkRuns.some(
        (run) => run.status === "fail" || run.status === "error"
      );

      return {
        ...pr,
        gateStatus: allPassed ? "pass" : someFailed ? "fail" : "pending",
        failingAgents,
      } as const;
    })
  );

  return prsWithStats;
}

export type GetRepositoryPullRequestsResponse = Awaited<
  ReturnType<typeof getRepositoryPullRequests>
>;

export const GET = withAuth(async (request, { params }) => {
  const userId = request.auth.userId;
  const { repoId } = await params;

  if (!repoId) {
    return NextResponse.json(
      { error: "Repository ID is required" },
      { status: 400 }
    );
  }

  const data = await getRepositoryPullRequests(userId, repoId);
  return NextResponse.json(data);
});
