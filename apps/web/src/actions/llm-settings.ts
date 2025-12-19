"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/utils/auth";
import { db } from "@/db";
import {
  ghOrganizations,
  organizationApiKeys,
  users,
  type LlmBillingMode,
  type ApiKeyProvider,
} from "@/db/schema";
import { getApiKeyPrefix } from "@/utils/encryption";

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
 * Update the organization's LLM billing mode
 */
export async function updateLlmBillingMode(mode: LlmBillingMode) {
  const orgId = await getDefaultOrgId();

  await db
    .update(ghOrganizations)
    .set({ llmBillingMode: mode })
    .where(eq(ghOrganizations.id, orgId));

  revalidatePath("/organization/settings");
  return { success: true };
}

/**
 * Save an API key for a provider
 * The key will be automatically encrypted by the Drizzle custom type
 */
export async function saveApiKey(provider: ApiKeyProvider, apiKey: string) {
  const orgId = await getDefaultOrgId();

  // Validate the API key format based on provider
  if (provider === "anthropic") {
    if (!apiKey.startsWith("sk-ant-")) {
      return {
        success: false,
        error:
          "Invalid Anthropic API key format. Key should start with 'sk-ant-'",
      };
    }
  }

  // Get the prefix for display purposes
  const keyPrefix = getApiKeyPrefix(apiKey);

  // Upsert the API key (update if exists, insert if not)
  const existing = await db
    .select({ id: organizationApiKeys.id })
    .from(organizationApiKeys)
    .where(
      and(
        eq(organizationApiKeys.ghOrganizationId, orgId),
        eq(organizationApiKeys.provider, provider)
      )
    )
    .limit(1);

  if (existing[0]) {
    // Update existing key
    await db
      .update(organizationApiKeys)
      .set({
        encryptedKey: apiKey, // Will be encrypted by the custom type
        keyPrefix,
      })
      .where(eq(organizationApiKeys.id, existing[0].id));
  } else {
    // Insert new key
    await db.insert(organizationApiKeys).values({
      ghOrganizationId: orgId,
      provider,
      encryptedKey: apiKey, // Will be encrypted by the custom type
      keyPrefix,
    });
  }

  revalidatePath("/organization/settings");
  return { success: true };
}

/**
 * Delete an API key for a provider
 */
export async function deleteApiKey(provider: ApiKeyProvider) {
  const orgId = await getDefaultOrgId();

  await db
    .delete(organizationApiKeys)
    .where(
      and(
        eq(organizationApiKeys.ghOrganizationId, orgId),
        eq(organizationApiKeys.provider, provider)
      )
    );

  revalidatePath("/organization/settings");
  return { success: true };
}

/**
 * Test an Anthropic API key by making a simple API call
 */
export async function testAnthropicApiKey(apiKey: string) {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1,
        messages: [{ role: "user", content: "Hi" }],
      }),
    });

    if (response.ok) {
      return { success: true, message: "API key is valid" };
    }

    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      errorData.error?.message || `API returned status ${response.status}`;

    return { success: false, error: errorMessage };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to test API key",
    };
  }
}
