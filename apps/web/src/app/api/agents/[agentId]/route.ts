import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { withAuth } from "@/utils/middleware";
import { db } from "@/db";
import {
  agents,
  agentTemplates,
  prCheckRuns,
  pullRequests,
  repoAgents,
  repositories,
  users,
} from "@/db/schema";

async function getAgentDetail(userId: string, agentId: string) {
  // Resolve org
  const user = await db
    .select({ defaultGhOrganizationId: users.defaultGhOrganizationId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user[0]?.defaultGhOrganizationId) {
    throw new Error("No default organization set");
  }
  const orgId = user[0].defaultGhOrganizationId;

  // Agent core info (ensure scoping to org and not archived)
  const theAgent = await db
    .select({
      id: agents.id,
      name: agents.name,
      agentTemplateId: agents.agentTemplateId,
      prompt: agents.prompt,
      engine: agents.engine,
      archived: agents.archived,
      description: agents.description,
      updatedAt: agents.updatedAt,
    })
    .from(agents)
    .where(
      and(
        eq(agents.id, agentId),
        eq(agents.ownerGhOrganizationId, orgId),
        eq(agents.archived, false)
      )
    )
    .limit(1);

  if (!theAgent[0]) {
    throw new Error("Agent not found");
  }

  // Get agent template information (only if this is a managed agent with a template)
  let agentTemplate: {
    id: string;
    name: string;
    slug: string;
    description: string;
    basePrompt: string;
    category: string | null;
    icon: string | null;
  } | null = null;

  if (theAgent[0].agentTemplateId) {
    const templateResult = await db
      .select({
        id: agentTemplates.id,
        name: agentTemplates.name,
        slug: agentTemplates.slug,
        description: agentTemplates.description,
        basePrompt: agentTemplates.basePrompt,
        category: agentTemplates.category,
        icon: agentTemplates.icon,
      })
      .from(agentTemplates)
      .where(eq(agentTemplates.id, theAgent[0].agentTemplateId))
      .limit(1);

    agentTemplate = templateResult[0] ?? null;
  }

  // Repos using this agent
  const reposUsing = await db
    .select({
      repoId: repositories.id,
      repoName: repositories.name,
      enabled: repoAgents.enabled,
    })
    .from(repoAgents)
    .innerJoin(repositories, eq(repoAgents.repoId, repositories.id))
    .where(
      and(
        eq(repoAgents.agentId, agentId),
        eq(repoAgents.ownerGhOrganizationId, orgId)
      )
    );

  // Recent runs for this agent (latest 10)
  const recentRunsRaw = await db
    .select({
      status: prCheckRuns.status,
      runtimeMs: prCheckRuns.runtimeMs,
      repoId: prCheckRuns.repoId,
      prId: prCheckRuns.prId,
      createdAt: prCheckRuns.createdAt,
      repoName: repositories.name,
      prNumber: pullRequests.prNumber,
    })
    .from(prCheckRuns)
    .innerJoin(repositories, eq(prCheckRuns.repoId, repositories.id))
    .innerJoin(pullRequests, eq(prCheckRuns.prId, pullRequests.id))
    .where(eq(prCheckRuns.agentId, agentId))
    .orderBy(desc(prCheckRuns.createdAt))
    .limit(10);

  // Compute last run status by repo from a slightly larger recent set to avoid N+1
  const lastRunsSource = await db
    .select({
      repoId: prCheckRuns.repoId,
      status: prCheckRuns.status,
      createdAt: prCheckRuns.createdAt,
    })
    .from(prCheckRuns)
    .where(eq(prCheckRuns.agentId, agentId))
    .orderBy(desc(prCheckRuns.createdAt))
    .limit(200);

  const lastRunByRepo = new Map<string, string>();
  for (const run of lastRunsSource) {
    if (!lastRunByRepo.has(run.repoId)) {
      lastRunByRepo.set(run.repoId, run.status);
    }
  }

  const reposUsingWithLastRun = reposUsing.map((r) => ({
    ...r,
    lastRunStatus: lastRunByRepo.get(r.repoId) ?? null,
  }));

  return {
    agent: theAgent[0],
    agentTemplate,
    reposUsing: reposUsingWithLastRun,
    recentRuns: recentRunsRaw,
  } as const;
}

export type GetAgentDetailResponse = Awaited<ReturnType<typeof getAgentDetail>>;

export const GET = withAuth(async (request, { params }) => {
  const userId = request.auth.userId;
  const { agentId } = await params;

  if (!agentId) {
    return NextResponse.json(
      { error: "Agent ID is required" },
      { status: 400 }
    );
  }

  try {
    const data = await getAgentDetail(userId, agentId);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load agent",
      },
      { status: 400 }
    );
  }
});
