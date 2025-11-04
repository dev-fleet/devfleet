"use server";

import { getSession } from "@/utils/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

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
