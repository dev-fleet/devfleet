"use server";

import { eq } from "drizzle-orm";
import { getSession } from "@/utils/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function deleteAccount() {
  const session = await getSession();

  if (!session) {
    return { success: false, message: "Not authenticated" };
  }

  try {
    // Delete the user - cascades will handle sessions, accounts, and memberships
    await db.delete(users).where(eq(users.id, session.user.id));

    return { success: true, message: "Account deleted successfully" };
  } catch (error) {
    console.error("Error deleting account:", error);
    return {
      success: false,
      message: "Failed to delete account",
    };
  }
}
