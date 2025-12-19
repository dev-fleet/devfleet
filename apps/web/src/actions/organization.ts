"use server";

import { accounts, userGhOrganizationMemberships, users } from "@/db/schema";
import { getSession } from "@/utils/auth";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { syncUserOrgsAndMemberships } from "@/utils/server/github";

export async function setActiveOrganization(organizationId: string) {
  const session = await getSession();

  if (!session) {
    return { success: false, message: "Not authenticated" };
  }

  try {
    // Verify the user has access to this organization
    const userGhOrganizationMembership = await db
      .select()
      .from(userGhOrganizationMemberships)
      .where(
        and(
          eq(userGhOrganizationMemberships.userId, session.user.id),
          eq(userGhOrganizationMemberships.ghOrganizationId, organizationId)
        )
      )
      .limit(1);

    if (userGhOrganizationMembership.length === 0) {
      return { success: false, message: "Access denied to this organization" };
    }

    // Update the user's active organization
    await db
      .update(users)
      .set({
        defaultGhOrganizationId: organizationId,
      })
      .where(eq(users.id, session.user.id));

    return { success: true, message: "Active organization updated" };
  } catch (error) {
    console.error("Error setting active organization:", error);
    return {
      success: false,
      message: "Failed to set active organization",
    };
  }
}

export async function syncOrganizations() {
  const session = await getSession();

  if (!session) {
    return { success: false, message: "Not authenticated" };
  }

  try {
    const githubAccount = await db
      .select({ accessToken: accounts.accessToken })
      .from(accounts)
      .where(
        and(
          eq(accounts.userId, session.user.id),
          eq(accounts.providerId, "github")
        )
      )
      .limit(1);

    if (!githubAccount[0]?.accessToken) {
      return { success: false, message: "GitHub account not connected" };
    }

    await syncUserOrgsAndMemberships(
      session.user.id,
      githubAccount[0].accessToken
    );

    return { success: true };
  } catch (error) {
    console.error("Error syncing organizations:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
