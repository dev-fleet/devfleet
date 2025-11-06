"use server";

import { getSession } from "@/utils/auth";
import { db } from "@/db";
import { repositories, repoAgents, agents, users } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * Get the current user's default organization ID
 */
async function getDefaultOrgId() {
  const session = await getSession();
  if (!session) {
    throw new Error("Not authenticated");
  }

  const user = await db
    .select({ defaultGhOrganizationId: users.defaultGhOrganizationId })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user[0]?.defaultGhOrganizationId) {
    throw new Error("No default organization set");
  }

  return user[0].defaultGhOrganizationId;
}

/**
 * Get a single repository with detailed information
 */
async function getRepository(repoId: string) {
  const orgId = await getDefaultOrgId();

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

/**
 * Add an agent to a repository
 */
export async function addAgentToRepository(repoId: string, agentId: string) {
  const orgId = await getDefaultOrgId();

  // Verify repo and agent belong to org
  await getRepository(repoId);
  const agent = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerGhOrganizationId, orgId)))
    .limit(1);

  if (!agent[0]) {
    throw new Error("Agent not found");
  }

  // Get the current max order for this repo
  const maxOrderResult = await db
    .select({ maxOrder: sql<number>`coalesce(max(${repoAgents.order}), -1)` })
    .from(repoAgents)
    .where(eq(repoAgents.repoId, repoId));

  const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;

  // Insert the new repo agent
  await db.insert(repoAgents).values({
    ownerGhOrganizationId: orgId,
    repoId,
    agentId,
    enabled: true,
    order: nextOrder,
  });

  return { success: true };
}

/**
 * Remove an agent from a repository
 */
export async function removeAgentFromRepository(repoAgentId: string) {
  const orgId = await getDefaultOrgId();

  await db
    .delete(repoAgents)
    .where(
      and(
        eq(repoAgents.id, repoAgentId),
        eq(repoAgents.ownerGhOrganizationId, orgId)
      )
    );

  return { success: true };
}

/**
 * Toggle agent enabled status
 */
export async function toggleAgentEnabled(repoAgentId: string) {
  const orgId = await getDefaultOrgId();

  // Get current status
  const currentRepoAgent = await db
    .select({ enabled: repoAgents.enabled })
    .from(repoAgents)
    .where(
      and(
        eq(repoAgents.id, repoAgentId),
        eq(repoAgents.ownerGhOrganizationId, orgId)
      )
    )
    .limit(1);

  if (!currentRepoAgent[0]) {
    throw new Error("Agent configuration not found");
  }

  // Toggle the enabled status
  await db
    .update(repoAgents)
    .set({ enabled: !currentRepoAgent[0].enabled })
    .where(eq(repoAgents.id, repoAgentId));

  return { success: true, enabled: !currentRepoAgent[0].enabled };
}

/**
 * Reorder agents for a repository
 */
export async function reorderAgents(
  repoId: string,
  agentOrders: { repoAgentId: string; order: number }[]
) {
  const orgId = await getDefaultOrgId();

  // Verify repo belongs to org
  await getRepository(repoId);

  // Update all orders in a transaction
  await Promise.all(
    agentOrders.map(({ repoAgentId, order }) =>
      db
        .update(repoAgents)
        .set({ order })
        .where(
          and(
            eq(repoAgents.id, repoAgentId),
            eq(repoAgents.repoId, repoId),
            eq(repoAgents.ownerGhOrganizationId, orgId)
          )
        )
    )
  );

  return { success: true };
}
