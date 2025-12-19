import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { withAuth } from "@/utils/middleware";
import { db } from "@/db";
import { ghOrganizations, organizationApiKeys, users } from "@/db/schema";

async function getOrganizationSettings(userId: string) {
  // Get the user's default organization
  const user = await db
    .select({ defaultGhOrganizationId: users.defaultGhOrganizationId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user[0]?.defaultGhOrganizationId) {
    throw new Error("No default organization set");
  }

  const orgId = user[0].defaultGhOrganizationId;

  // Get organization with LLM billing mode
  const org = await db
    .select({
      id: ghOrganizations.id,
      login: ghOrganizations.login,
      displayName: ghOrganizations.displayName,
      llmBillingMode: ghOrganizations.llmBillingMode,
    })
    .from(ghOrganizations)
    .where(eq(ghOrganizations.id, orgId))
    .limit(1);

  if (!org[0]) {
    throw new Error("Organization not found");
  }

  // Get API keys for the organization (only return prefix, never the actual key)
  const apiKeys = await db
    .select({
      id: organizationApiKeys.id,
      provider: organizationApiKeys.provider,
      keyPrefix: organizationApiKeys.keyPrefix,
      createdAt: organizationApiKeys.createdAt,
      updatedAt: organizationApiKeys.updatedAt,
    })
    .from(organizationApiKeys)
    .where(eq(organizationApiKeys.ghOrganizationId, orgId));

  return {
    organization: org[0],
    apiKeys,
  };
}

export type GetOrganizationSettingsResponse = Awaited<
  ReturnType<typeof getOrganizationSettings>
>;

export const GET = withAuth(async (request) => {
  const userId = request.auth.userId;
  const data = await getOrganizationSettings(userId);
  return NextResponse.json(data);
});

