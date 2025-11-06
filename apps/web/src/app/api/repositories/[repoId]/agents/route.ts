import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { withAuth } from "@/utils/middleware";
import { db } from "@/db";
import { agents, repoAgents, users } from "@/db/schema";

async function getRepositoryAgents(userId: string, repoId: string) {
  const user = await db
    .select({ defaultGhOrganizationId: users.defaultGhOrganizationId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user[0]?.defaultGhOrganizationId) {
    throw new Error("No default organization set");
  }

  const orgId = user[0].defaultGhOrganizationId;

  const repoAgentsData = await db
    .select({
      repoAgentId: repoAgents.id,
      agentId: agents.id,
      agentName: agents.name,
      agentDescription: agents.description,
      agentEngine: agents.engine,
      enabled: repoAgents.enabled,
      order: repoAgents.order,
    })
    .from(repoAgents)
    .innerJoin(agents, eq(repoAgents.agentId, agents.id))
    .where(
      and(
        eq(repoAgents.repoId, repoId),
        eq(repoAgents.ownerGhOrganizationId, orgId)
      )
    )
    .orderBy(repoAgents.order);

  return repoAgentsData;
}

export type GetRepositoryAgentsResponse = Awaited<
  ReturnType<typeof getRepositoryAgents>
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

  const data = await getRepositoryAgents(userId, repoId);
  return NextResponse.json(data);
});
