import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { organizations, memberships } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all organizations the user is a member of
    const userOrgs = await db
      .select({
        id: organizations.id,
        githubId: organizations.githubId,
        login: organizations.login,
        name: organizations.name,
        description: organizations.description,
        avatarUrl: organizations.avatarUrl,
        htmlUrl: organizations.htmlUrl,
        type: organizations.type,
        publicRepos: organizations.publicRepos,
        publicGists: organizations.publicGists,
        followers: organizations.followers,
        following: organizations.following,
        role: memberships.role,
        joinedAt: memberships.createdAt,
      })
      .from(organizations)
      .innerJoin(memberships, eq(memberships.organizationId, organizations.id))
      .where(eq(memberships.userId, session.user.id))
      .orderBy(organizations.type, organizations.login);

    return NextResponse.json(userOrgs);
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
