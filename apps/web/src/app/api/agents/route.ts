import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { withAuth } from "@/utils/middleware";
import { db } from "@/db";
import { agents, users } from "@/db/schema";

async function getOrganizationAgents(userId: string) {
  const user = await db
    .select({ defaultGhOrganizationId: users.defaultGhOrganizationId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user[0]?.defaultGhOrganizationId) {
    throw new Error("No default organization set");
  }

  const orgId = user[0].defaultGhOrganizationId;

  const orgAgents = await db
    .select({
      id: agents.id,
      name: agents.name,
      description: agents.description,
      engine: agents.engine,
    })
    .from(agents)
    .where(
      and(eq(agents.ownerGhOrganizationId, orgId), eq(agents.archived, false))
    )
    .orderBy(agents.name);

  return orgAgents;
}

export type GetOrganizationAgentsResponse = Awaited<
  ReturnType<typeof getOrganizationAgents>
>;

export const GET = withAuth(async (request) => {
  const userId = request.auth.userId;
  const data = await getOrganizationAgents(userId);
  return NextResponse.json(data);
});
