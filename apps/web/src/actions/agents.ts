"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/utils/auth";
import { db } from "@/db";
import { agents, users, agentTemplates, repoAgents } from "@/db/schema";

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

/**
 * Create an agent. Supports two modes:
 * - Managed agent: provide agentTemplateId, prompt is null (inherits from template)
 * - Custom agent: no agentTemplateId, must provide prompt
 */
export async function createAgent(input: {
  name: string;
  agentTemplateId?: string | null;
  engine: Engine;
  description?: string | null;
  prompt?: string | null;
}) {
  const orgId = await getDefaultOrgId();

  // Validate: either managed (has template) or custom (has prompt)
  if (!input.agentTemplateId && !input.prompt) {
    throw new Error("Custom agents must have a prompt");
  }

  // For managed agents, verify the template exists
  if (input.agentTemplateId) {
    const agentTemplate = await db
      .select({ id: agentTemplates.id })
      .from(agentTemplates)
      .where(eq(agentTemplates.id, input.agentTemplateId))
      .limit(1);

    if (!agentTemplate[0]) {
      throw new Error("Agent template not found");
    }
  }

  // Create the agent
  // - Managed: agentTemplateId set, prompt null (uses template's basePrompt at runtime)
  // - Custom: agentTemplateId null, prompt set
  const createdAgents = await db
    .insert(agents)
    .values({
      name: input.name,
      agentTemplateId: input.agentTemplateId ?? null,
      prompt: input.agentTemplateId ? null : input.prompt,
      engine: input.engine,
      description: input.description ?? null,
      ownerGhOrganizationId: orgId,
    })
    .returning({ id: agents.id });

  const created = createdAgents[0];
  if (!created) throw new Error("Failed to create agent");

  revalidatePath("/dashboard/agents");
  return { id: created.id };
}

export async function updateAgent(
  agentId: string,
  input: Partial<{
    name: string;
    engine: Engine;
    description: string | null;
    prompt: string | null;
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
      prompt: input.prompt,
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

  revalidatePath("/dashboard/agents");
  return { id: created.id } as const;
}

export async function archiveAgent(agentId: string) {
  const orgId = await getDefaultOrgId();

  await db.transaction(async (tx) => {
    // Remove agent from all repositories before archiving
    await tx
      .delete(repoAgents)
      .where(
        and(
          eq(repoAgents.agentId, agentId),
          eq(repoAgents.ownerGhOrganizationId, orgId)
        )
      );

    await tx
      .update(agents)
      .set({ archived: true })
      .where(
        and(eq(agents.id, agentId), eq(agents.ownerGhOrganizationId, orgId))
      );
  });

  revalidatePath("/dashboard/agents");
  revalidatePath("/repositories");
  return { success: true } as const;
}

export async function updateAgentPrompt(agentId: string, prompt: string) {
  const orgId = await getDefaultOrgId();

  // Verify agent belongs to org
  const agent = await db
    .select({ id: agents.id })
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerGhOrganizationId, orgId)))
    .limit(1);

  if (!agent[0]) throw new Error("Agent not found");

  await db
    .update(agents)
    .set({ prompt })
    .where(
      and(eq(agents.id, agentId), eq(agents.ownerGhOrganizationId, orgId))
    );

  revalidatePath(`/dashboard/agents/${agentId}`);
  revalidatePath(`/agents/${agentId}`);
  return { success: true } as const;
}

/**
 * Create an agent with repository configuration. Supports two modes:
 * - Managed agent: provide agentTemplateId without prompt (subscribes to template)
 * - Custom/Forked agent: provide prompt (template is optional, used only for initial copy)
 */
export async function createAgentWithConfiguration(input: {
  agentTemplateId?: string | null;
  name: string;
  engine: Engine;
  description?: string | null;
  prompt?: string | null;
  repositoryIds: string[];
}) {
  try {
    const orgId = await getDefaultOrgId();

    // Validate: either managed (has template, no prompt) or custom (has prompt)
    if (!input.agentTemplateId && !input.prompt) {
      return { success: false, error: "Custom agents must have a prompt" };
    }

    // For managed agents, verify the template exists
    if (input.agentTemplateId) {
      const agentTemplate = await db
        .select({ id: agentTemplates.id })
        .from(agentTemplates)
        .where(eq(agentTemplates.id, input.agentTemplateId))
        .limit(1);

      if (!agentTemplate[0]) {
        return { success: false, error: "Agent template not found" };
      }
    }

    // Determine if this is managed or custom/forked:
    // - If prompt is provided, it's a custom/forked agent (no template link)
    // - If no prompt but has template, it's managed (subscribes to template)
    const isCustom = !!input.prompt;

    const createdAgents = await db
      .insert(agents)
      .values({
        name: input.name,
        agentTemplateId: isCustom ? null : input.agentTemplateId,
        prompt: isCustom ? input.prompt : null,
        engine: input.engine,
        description: input.description ?? null,
        ownerGhOrganizationId: orgId,
      })
      .returning({ id: agents.id });

    const created = createdAgents[0];
    if (!created) {
      return { success: false, error: "Failed to create agent" };
    }

    // Associate agent with repositories
    if (input.repositoryIds.length > 0) {
      await db.insert(repoAgents).values(
        input.repositoryIds.map((repoId) => ({
          ownerGhOrganizationId: orgId,
          repoId,
          agentId: created.id,
          enabled: true,
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
