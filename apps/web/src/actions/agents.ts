"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/utils/auth";
import { db } from "@/db";
import {
  agents,
  users,
  agentTypeRules,
  agentRules,
  agentTypes,
} from "@/db/schema";

type Engine = "anthropic" | "openai";

async function getDefaultOrgId() {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const user = await db
    .select({ defaultGhOrganizationId: users.defaultGhOrganizationId })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const orgId = user[0]?.defaultGhOrganizationId;
  if (!orgId) throw new Error("No default organization set");
  return orgId;
}

export async function createAgent(input: {
  name: string;
  agentTypeId: string;
  engine: Engine;
  description?: string | null;
}) {
  const orgId = await getDefaultOrgId();

  // Verify agent type exists
  const agentType = await db
    .select({ id: agentTypes.id })
    .from(agentTypes)
    .where(eq(agentTypes.id, input.agentTypeId))
    .limit(1);

  if (!agentType[0]) {
    throw new Error("Agent type not found");
  }

  // Create the agent
  const [created] = await db
    .insert(agents)
    .values({
      name: input.name,
      agentTypeId: input.agentTypeId,
      prompt: null, // Use base prompt from agent type
      engine: input.engine,
      description: input.description ?? null,
      ownerGhOrganizationId: orgId,
    })
    .returning({ id: agents.id });

  // Create default agent rules based on agent type rules
  const defaultRules = await db
    .select({
      id: agentTypeRules.id,
      defaultEnabled: agentTypeRules.defaultEnabled,
    })
    .from(agentTypeRules)
    .where(eq(agentTypeRules.agentTypeId, input.agentTypeId));

  if (defaultRules.length > 0) {
    await db.insert(agentRules).values(
      defaultRules.map((rule) => ({
        agentId: created.id,
        agentTypeRuleId: rule.id,
        enabled: rule.defaultEnabled,
      }))
    );
  }

  revalidatePath("/dashboard/agents");
  return { id: created.id };
}

export async function updateAgent(
  agentId: string,
  input: Partial<{
    name: string;
    engine: Engine;
    description: string | null;
  }>
) {
  const orgId = await getDefaultOrgId();

  // Ensure agent belongs to org
  const existing = await db
    .select({ id: agents.id })
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerGhOrganizationId, orgId)))
    .limit(1);
  if (!existing[0]) throw new Error("Agent not found");

  await db
    .update(agents)
    .set({
      name: input.name,
      engine: input.engine,
      description: input.description,
    })
    .where(
      and(eq(agents.id, agentId), eq(agents.ownerGhOrganizationId, orgId))
    );

  revalidatePath(`/dashboard/agents/${agentId}`);
  revalidatePath("/dashboard/agents");
  return { success: true } as const;
}

export async function duplicateAgent(agentId: string) {
  const orgId = await getDefaultOrgId();

  const source = await db
    .select({
      name: agents.name,
      agentTypeId: agents.agentTypeId,
      prompt: agents.prompt,
      engine: agents.engine,
      description: agents.description,
    })
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerGhOrganizationId, orgId)))
    .limit(1);
  if (!source[0]) throw new Error("Agent not found");

  const newName = `${source[0].name} (copy)`;
  const [created] = await db
    .insert(agents)
    .values({
      name: newName,
      agentTypeId: source[0].agentTypeId,
      prompt: source[0].prompt,
      engine: source[0].engine as Engine,
      description: source[0].description,
      ownerGhOrganizationId: orgId,
    })
    .returning({ id: agents.id });

  // Copy rule configurations from source agent
  const sourceRules = await db
    .select({
      agentTypeRuleId: agentRules.agentTypeRuleId,
      enabled: agentRules.enabled,
    })
    .from(agentRules)
    .where(eq(agentRules.agentId, agentId));

  if (sourceRules.length > 0) {
    await db.insert(agentRules).values(
      sourceRules.map((rule) => ({
        agentId: created.id,
        agentTypeRuleId: rule.agentTypeRuleId,
        enabled: rule.enabled,
      }))
    );
  }

  revalidatePath("/dashboard/agents");
  return { id: created.id } as const;
}

export async function archiveAgent(agentId: string) {
  const orgId = await getDefaultOrgId();

  await db
    .update(agents)
    .set({ archived: true })
    .where(
      and(eq(agents.id, agentId), eq(agents.ownerGhOrganizationId, orgId))
    );

  revalidatePath("/dashboard/agents");
  return { success: true } as const;
}

export async function toggleAgentRule(agentId: string, ruleId: string) {
  const orgId = await getDefaultOrgId();

  // Verify agent belongs to org
  const agent = await db
    .select({ id: agents.id })
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerGhOrganizationId, orgId)))
    .limit(1);

  if (!agent[0]) throw new Error("Agent not found");

  // Get current rule state
  const currentRule = await db
    .select({ enabled: agentRules.enabled })
    .from(agentRules)
    .where(
      and(eq(agentRules.agentId, agentId), eq(agentRules.agentTypeRuleId, ruleId))
    )
    .limit(1);

  if (!currentRule[0]) throw new Error("Rule configuration not found");

  // Toggle the enabled state
  await db
    .update(agentRules)
    .set({ enabled: !currentRule[0].enabled })
    .where(
      and(eq(agentRules.agentId, agentId), eq(agentRules.agentTypeRuleId, ruleId))
    );

  revalidatePath(`/dashboard/agents/${agentId}`);
  return { success: true, enabled: !currentRule[0].enabled } as const;
}

export async function bulkUpdateAgentRules(
  agentId: string,
  updates: { ruleId: string; enabled: boolean }[]
) {
  const orgId = await getDefaultOrgId();

  // Verify agent belongs to org
  const agent = await db
    .select({ id: agents.id })
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerGhOrganizationId, orgId)))
    .limit(1);

  if (!agent[0]) throw new Error("Agent not found");

  // Update all rules
  await Promise.all(
    updates.map(({ ruleId, enabled }) =>
      db
        .update(agentRules)
        .set({ enabled })
        .where(
          and(
            eq(agentRules.agentId, agentId),
            eq(agentRules.agentTypeRuleId, ruleId)
          )
        )
    )
  );

  revalidatePath(`/dashboard/agents/${agentId}`);
  return { success: true } as const;
}
