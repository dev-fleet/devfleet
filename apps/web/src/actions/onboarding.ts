"use server";

import { getSession } from "@/utils/auth";
import { db } from "@/db";
import { users, organizationApiKeys, agents, agentTemplates } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getApiKeyPrefixAndSuffix } from "@/db/encryption";
import { revalidatePath } from "next/cache";

export async function getCurrentOnboardingStep() {
  const session = await getSession();

  if (!session) {
    throw new Error("No session found");
  }

  const user = await db
    .select({
      onboardingStep: users.onboardingStep,
      onboardingCompletedAt: users.onboardingCompletedAt,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user[0]) {
    throw new Error("User not found in database");
  }

  return user[0];
}

export async function completeOnboarding() {
  const session = await getSession();

  if (!session) {
    throw new Error("No session found");
  }

  await db
    .update(users)
    .set({ onboardingStep: "completed", onboardingCompletedAt: new Date() })
    .where(eq(users.id, session.user.id));

  redirect("/dashboard");
}

/**
 * Advance from agent step to llm step.
 * Used during onboarding when skipping agent configuration.
 */
export async function advanceToLlmStep() {
  const session = await getSession();

  if (!session) {
    throw new Error("No session found");
  }

  await db
    .update(users)
    .set({ onboardingStep: "llm" })
    .where(eq(users.id, session.user.id));

  redirect("/onboarding/llm");
}

/**
 * Create an agent during onboarding and advance to llm step.
 * Creates the agent without assigning it to any repositories.
 */
export async function createAgentAndAdvance(agentTemplateId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const session = await getSession();

  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  // Get user's default organization
  const user = await db
    .select({
      id: users.id,
      defaultGhOrganizationId: users.defaultGhOrganizationId,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user[0]) {
    return { success: false, error: "User not found" };
  }

  const orgId = user[0].defaultGhOrganizationId;
  if (!orgId) {
    return {
      success: false,
      error: "No organization set. Please complete GitHub setup first.",
    };
  }

  // Verify agent template exists and get its data
  const template = await db
    .select({
      id: agentTemplates.id,
      name: agentTemplates.name,
      basePrompt: agentTemplates.basePrompt,
    })
    .from(agentTemplates)
    .where(eq(agentTemplates.id, agentTemplateId))
    .limit(1);

  if (!template[0]) {
    return { success: false, error: "Agent template not found" };
  }

  // Create the agent
  const createdAgents = await db
    .insert(agents)
    .values({
      name: template[0].name,
      agentTemplateId: template[0].id,
      prompt: template[0].basePrompt,
      engine: "anthropic",
      description: null,
      ownerGhOrganizationId: orgId,
    })
    .returning({ id: agents.id });

  if (!createdAgents[0]) {
    return { success: false, error: "Failed to create agent" };
  }

  // Update onboarding step
  await db
    .update(users)
    .set({ onboardingStep: "llm" })
    .where(eq(users.id, session.user.id));

  revalidatePath("/agents");
  revalidatePath("/dashboard/agents");

  return { success: true };
}

/**
 * Save an Anthropic API key and complete onboarding.
 * Used during onboarding only (llm is the final step).
 */
export async function saveApiKeyAndAdvanceOnboarding(apiKey: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const session = await getSession();

  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  // Validate API key format
  if (!apiKey.startsWith("sk-ant-")) {
    return {
      success: false,
      error: "Invalid Anthropic API key format. Key should start with 'sk-ant-'",
    };
  }

  // Get user with their default organization
  const user = await db
    .select({
      id: users.id,
      onboardingStep: users.onboardingStep,
      defaultGhOrganizationId: users.defaultGhOrganizationId,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user[0]) {
    return { success: false, error: "User not found" };
  }

  const orgId = user[0].defaultGhOrganizationId;
  if (!orgId) {
    return {
      success: false,
      error: "No organization set. Please complete GitHub setup first.",
    };
  }

  // Get prefix and suffix for display
  const { prefix: keyPrefix, suffix: keySuffix } = getApiKeyPrefixAndSuffix(
    apiKey,
    "anthropic"
  );

  // Check if key already exists
  const existing = await db
    .select({ id: organizationApiKeys.id })
    .from(organizationApiKeys)
    .where(
      and(
        eq(organizationApiKeys.ghOrganizationId, orgId),
        eq(organizationApiKeys.provider, "anthropic")
      )
    )
    .limit(1);

  if (existing[0]) {
    // Update existing key
    await db
      .update(organizationApiKeys)
      .set({
        encryptedKey: apiKey,
        keyPrefix,
        keySuffix,
      })
      .where(eq(organizationApiKeys.id, existing[0].id));
  } else {
    // Insert new key
    await db.insert(organizationApiKeys).values({
      ghOrganizationId: orgId,
      provider: "anthropic",
      encryptedKey: apiKey,
      keyPrefix,
      keySuffix,
    });
  }

  // Complete onboarding (llm is the final step)
  if (user[0].onboardingStep === "llm") {
    await db
      .update(users)
      .set({ onboardingStep: "completed", onboardingCompletedAt: new Date() })
      .where(eq(users.id, session.user.id));
  }

  return { success: true };
}
