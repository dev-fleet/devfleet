import { NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { withAuth } from "@/utils/middleware";
import { db } from "@/db";
import {
  agents,
  agentTypes,
  agentTypeRules,
  agentRules,
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
      agentTypeId: agents.agentTypeId,
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

  // Get agent type information
  const agentType = await db
    .select({
      id: agentTypes.id,
      name: agentTypes.name,
      slug: agentTypes.slug,
      description: agentTypes.description,
      basePrompt: agentTypes.basePrompt,
      category: agentTypes.category,
      icon: agentTypes.icon,
    })
    .from(agentTypes)
    .where(eq(agentTypes.id, theAgent[0].agentTypeId))
    .limit(1);

  // Get all rules for this agent type with their enabled status
  const rulesRaw = await db
    .select({
      id: agentTypeRules.id,
      name: agentTypeRules.name,
      description: agentTypeRules.description,
      severity: agentTypeRules.severity,
      category: agentTypeRules.category,
      order: agentTypeRules.order,
      agentRuleId: agentRules.id,
      enabled: agentRules.enabled,
    })
    .from(agentTypeRules)
    .leftJoin(
      agentRules,
      and(
        eq(agentRules.agentTypeRuleId, agentTypeRules.id),
        eq(agentRules.agentId, agentId)
      )
    )
    .where(eq(agentTypeRules.agentTypeId, theAgent[0].agentTypeId))
    .orderBy(agentTypeRules.order);

  const rules = rulesRaw.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    severity: r.severity,
    category: r.category,
    order: r.order,
    enabled: r.enabled ?? false,
  }));

  // Repos using this agent
  const reposUsing = await db
    .select({
      repoId: repositories.id,
      repoName: repositories.name,
      enabled: repoAgents.enabled,
      order: repoAgents.order,
    })
    .from(repoAgents)
    .innerJoin(repositories, eq(repoAgents.repoId, repositories.id))
    .where(
      and(
        eq(repoAgents.agentId, agentId),
        eq(repoAgents.ownerGhOrganizationId, orgId)
      )
    )
    .orderBy(repoAgents.order);

  // Recent runs for this agent (latest 10)
  const recentRunsRaw = await db
    .select({
      status: prCheckRuns.status,
      message: prCheckRuns.message,
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
    agentType: agentType[0] ?? null,
    rules,
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
