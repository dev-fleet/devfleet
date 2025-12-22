import { db } from "@/db";
import { ghOrganizations, repoAgents } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Handle GitHub App installation removal (deletion or suspension)
 */
export async function handleInstallationRemoval(
  installationId: string,
  reason: "deleted" | "suspended" | "permission_revoked"
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(
      `Processing installation removal: ${installationId}, reason: ${reason}`
    );

    // Find organization with this installation ID
    const orgs = await db
      .select({ id: ghOrganizations.id })
      .from(ghOrganizations)
      .where(eq(ghOrganizations.githubAppInstallationId, installationId))
      .limit(1);

    if (orgs.length === 0) {
      console.warn(
        `No organization found for installation ID: ${installationId}`
      );
      return { success: false, error: "Organization not found" };
    }

    const orgId = orgs[0]!.id;

    await db.transaction(async (tx) => {
      // 1. Mark organization as disconnected
      await tx
        .update(ghOrganizations)
        .set({
          githubAppConnectionStatus: "disconnected",
          githubAppDisconnectedAt: new Date(),
          githubAppDisconnectedReason: reason,
          // Clear the installation ID so it can be reconnected later
          githubAppInstallationId: null,
          githubAppAccessToken: null,
          updatedAt: new Date(),
        })
        .where(eq(ghOrganizations.id, orgId));

      // 2. Disable all agents for this organization
      await tx
        .update(repoAgents)
        .set({
          enabled: false,
          disabledDueToGithubDisconnect: true,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(repoAgents.ownerGhOrganizationId, orgId),
            // Only disable agents that were previously enabled
            eq(repoAgents.enabled, true)
          )
        );
    });

    console.log(
      `Successfully processed installation removal for org: ${orgId}`
    );
    return { success: true };
  } catch (error) {
    console.error("Error handling installation removal:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Handle GitHub App installation reconnection (unsuspend or new installation)
 */
export async function handleInstallationReconnection(
  installationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Processing installation reconnection: ${installationId}`);

    // Find organization that was previously connected to this installation
    const orgs = await db
      .select()
      .from(ghOrganizations)
      .where(eq(ghOrganizations.githubAppInstallationId, installationId))
      .limit(1);

    if (orgs.length === 0) {
      console.warn(
        `No organization found for installation ID: ${installationId}`
      );
      return { success: false, error: "Organization not found" };
    }

    const org = orgs[0]!;
    const orgId = org.id;

    await db.transaction(async (tx) => {
      // 1. Mark organization as reconnected
      await tx
        .update(ghOrganizations)
        .set({
          githubAppConnectionStatus: "connected",
          githubAppDisconnectedAt: null,
          githubAppDisconnectedReason: null,
          githubAppInstallationId: installationId,
          updatedAt: new Date(),
        })
        .where(eq(ghOrganizations.id, orgId));

      // 2. Re-enable agents that were disabled due to disconnect
      await tx
        .update(repoAgents)
        .set({
          enabled: true,
          disabledDueToGithubDisconnect: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(repoAgents.ownerGhOrganizationId, orgId),
            eq(repoAgents.disabledDueToGithubDisconnect, true)
          )
        );
    });

    console.log(
      `Successfully processed installation reconnection for org: ${orgId}`
    );
    return { success: true };
  } catch (error) {
    console.error("Error handling installation reconnection:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if organization's GitHub connection is active
 */
export async function isGitHubConnected(
  organizationId: string
): Promise<boolean> {
  const org = await db
    .select({
      connectionStatus: ghOrganizations.githubAppConnectionStatus,
      installationId: ghOrganizations.githubAppInstallationId,
    })
    .from(ghOrganizations)
    .where(eq(ghOrganizations.id, organizationId))
    .limit(1);

  if (org.length === 0) return false;
  const userOrg = org[0]!;

  return userOrg.connectionStatus === "connected" && userOrg.installationId !== null;
}
