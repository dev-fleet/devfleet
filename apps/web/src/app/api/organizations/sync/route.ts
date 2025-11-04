import { NextResponse } from "next/server";
import { getSession } from "@/utils/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { syncUserOrgsAndMemberships } from "@/utils/server/github";

export async function POST() {
  try {
    const session = await getSession.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's GitHub access token
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
      return NextResponse.json(
        { error: "GitHub account not connected" },
        { status: 400 }
      );
    }

    await syncUserOrgsAndMemberships(
      session.user.id,
      githubAccount[0].accessToken
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error syncing organizations:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
