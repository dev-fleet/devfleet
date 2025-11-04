"use server";

import { getSession } from "@/utils/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

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
