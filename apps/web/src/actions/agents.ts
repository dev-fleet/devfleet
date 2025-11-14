"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/utils/auth";
import { db } from "@/db";
import { agents, users, rules, agentRules, agentTemplates } from "@/db/schema";

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
  agentTemplateId: string;
  engine: Engine;
  description?: string | null;
}) {
  const orgId = await getDefaultOrgId();

  // Verify agent template exists
  const agentTemplate = await db
    .select({ id: agentTemplates.id })
    .from(agentTemplates)
    .where(eq(agentTemplates.id, input.agentTemplateId))
    .limit(1);

  if (!agentTemplate[0]) {
    throw new Error("Agent template not found");
  }

  // Create the agent
  const createdAgents = await db
    .insert(agents)
    .values({
      name: input.name,
      agentTemplateId: input.agentTemplateId,
      prompt: null, // Use base prompt from agent template
      engine: input.engine,
      description: input.description ?? null,
      ownerGhOrganizationId: orgId,
    })
    .returning({ id: agents.id });

  const created = createdAgents[0];
  if (!created) throw new Error("Failed to create agent");

  // Create default agent rules based on agent template rules
  const defaultRules = await db
    .select({
      id: rules.id,
      defaultEnabled: rules.defaultEnabled,
    })
    .from(rules)
    .where(eq(rules.agentTemplateId, input.agentTemplateId));

  if (defaultRules.length > 0) {
    await db.insert(agentRules).values(
      defaultRules.map((rule) => ({
        agentId: created.id,
        ruleId: rule.id,
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
      agentTemplateId: agents.agentTemplateId,
      prompt: agents.prompt,
      engine: agents.engine,
      description: agents.description,
    })
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerGhOrganizationId, orgId)))
    .limit(1);
  if (!source[0]) throw new Error("Agent not found");

  const newName = `${source[0].name} (copy)`;
  const createdAgents = await db
    .insert(agents)
    .values({
      name: newName,
      agentTemplateId: source[0].agentTemplateId,
      prompt: source[0].prompt,
      engine: source[0].engine as Engine,
      description: source[0].description,
      ownerGhOrganizationId: orgId,
    })
    .returning({ id: agents.id });

  const created = createdAgents[0];
  if (!created) throw new Error("Failed to duplicate agent");

  // Copy rule configurations from source agent
  const sourceRules = await db
    .select({
      ruleId: agentRules.ruleId,
      enabled: agentRules.enabled,
    })
    .from(agentRules)
    .where(eq(agentRules.agentId, agentId));

  if (sourceRules.length > 0) {
    await db.insert(agentRules).values(
      sourceRules.map((rule) => ({
        agentId: created.id,
        ruleId: rule.ruleId,
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
    .where(and(eq(agentRules.agentId, agentId), eq(agentRules.ruleId, ruleId)))
    .limit(1);

  if (!currentRule[0]) throw new Error("Rule configuration not found");

  // Toggle the enabled state
  await db
    .update(agentRules)
    .set({ enabled: !currentRule[0].enabled })
    .where(and(eq(agentRules.agentId, agentId), eq(agentRules.ruleId, ruleId)));

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
          and(eq(agentRules.agentId, agentId), eq(agentRules.ruleId, ruleId))
        )
    )
  );

  revalidatePath(`/dashboard/agents/${agentId}`);
  return { success: true } as const;
}

export async function createAgentWithConfiguration(input: {
  agentTemplateId: string;
  name: string;
  engine: Engine;
  description?: string | null;
  rules: { ruleId: string; enabled: boolean }[];
  repositoryIds: string[];
}) {
  try {
    const orgId = await getDefaultOrgId();

    // Verify agent template exists
    const agentTemplate = await db
      .select({ id: agentTemplates.id })
      .from(agentTemplates)
      .where(eq(agentTemplates.id, input.agentTemplateId))
      .limit(1);

    if (!agentTemplate[0]) {
      return { success: false, error: "Agent template not found" };
    }

    // Create the agent
    const createdAgents = await db
      .insert(agents)
      .values({
        name: input.name,
        agentTemplateId: input.agentTemplateId,
        prompt: null, // Use base prompt from agent template
        engine: input.engine,
        description: input.description ?? null,
        ownerGhOrganizationId: orgId,
      })
      .returning({ id: agents.id });

    const created = createdAgents[0];
    if (!created) {
      return { success: false, error: "Failed to create agent" };
    }

    // Create agent rules with custom configurations
    if (input.rules.length > 0) {
      await db.insert(agentRules).values(
        input.rules.map((rule) => ({
          agentId: created.id,
          ruleId: rule.ruleId,
          enabled: rule.enabled,
        }))
      );
    }

    // Associate agent with repositories
    if (input.repositoryIds.length > 0) {
      const { repoAgents } = await import("@/db/schema");
      await db.insert(repoAgents).values(
        input.repositoryIds.map((repoId, index) => ({
          ownerGhOrganizationId: orgId,
          repoId,
          agentId: created.id,
          enabled: true,
          order: index,
        }))
      );
    }

    revalidatePath("/agents");
    revalidatePath("/dashboard/agents");
    return { success: true, agentId: created.id };
  } catch (error) {
    console.error("Error creating agent:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
