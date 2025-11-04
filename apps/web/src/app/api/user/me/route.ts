import { NextResponse } from "next/server";
import { getSession } from "@/utils/auth";
import { db } from "@/db";
import {
  users,
  ghOrganizations,
  userGhOrganizationMemberships,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { withError } from "@/utils/middleware";
import { SafeError } from "@/utils/error";

export type UserResponse = Awaited<ReturnType<typeof getUser>> | null;

async function getUser({ userId }: { userId: string }) {
  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const user = userRows[0];
  if (!user) throw new SafeError("User not found");

  const orgs = await db
    .select()
    .from(ghOrganizations)
    .innerJoin(
      userGhOrganizationMemberships,
      eq(userGhOrganizationMemberships.ghOrganizationId, ghOrganizations.id)
    )
    .where(eq(userGhOrganizationMemberships.userId, userId));

  // Return only the GitHub organization objects from the join results
  const organizations = orgs.map((row) => row.gh_organizations);

  return { ...user, organizations };
}

export const GET = withError(async () => {
  const session = await getSession();
  const userId = session?.user.id;
  if (!userId) return NextResponse.json(null);

  const result = await getUser({ userId });
  return NextResponse.json(result);
});
