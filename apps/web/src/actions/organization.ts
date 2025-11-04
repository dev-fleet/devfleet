"use server";

import { userGhOrganizationMemberships, users } from "@/db/schema";
import { getSession } from "@/utils/auth";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";

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
