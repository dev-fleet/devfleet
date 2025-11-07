"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/utils/auth";
import { db } from "@/db";
import { agents, users } from "@/db/schema";

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
  prompt: string;
  engine: Engine;
  languageFilter?: string | null; // stored in description for now
}) {
  const orgId = await getDefaultOrgId();

  const [created] = await db
    .insert(agents)
    .values({
      name: input.name,
      prompt: input.prompt,
      engine: input.engine,
      description: input.languageFilter ?? null,
      ownerGhOrganizationId: orgId,
    })
    .returning({ id: agents.id });

  revalidatePath("/dashboard/agents");
  return { id: created.id };
}

export async function updateAgent(
  agentId: string,
  input: Partial<{
    name: string;
    prompt: string;
    engine: Engine;
    languageFilter: string | null;
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
      prompt: input.prompt,
      engine: input.engine,
      description: input.languageFilter,
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
      prompt: source[0].prompt,
      engine: source[0].engine as Engine,
      description: source[0].description,
      ownerGhOrganizationId: orgId,
    })
    .returning({ id: agents.id });

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
