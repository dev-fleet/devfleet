import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { organizations, memberships, accounts } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { fetchUserOrganizations } from "@/actions/github";

export async function POST() {
  try {
    const session = await auth.api.getSession({
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

    // Fetch current organizations from GitHub
    const githubOrgs = await fetchUserOrganizations(
      githubAccount[0].accessToken
    );
    const githubOrgIds = githubOrgs.map((org) => org.id.toString());

    // Get current user memberships
    const currentMemberships = await db
      .select({
        organizationId: memberships.organizationId,
        githubId: organizations.githubId,
      })
      .from(memberships)
      .innerJoin(
        organizations,
        eq(memberships.organizationId, organizations.id)
      )
      .where(eq(memberships.userId, session.user.id));

    const currentGithubIds = currentMemberships.map((m) => m.githubId);

    // Determine what to add and remove
    const toAdd = githubOrgs.filter(
      (org) => !currentGithubIds.includes(org.id.toString())
    );
    const toRemoveGithubIds = currentGithubIds.filter(
      (id) => !githubOrgIds.includes(id)
    );

    let addedCount = 0;
    let removedCount = 0;

    // Add new organizations and memberships
    for (const org of toAdd) {
      // Upsert organization (insert or update if exists)
      const upsertedOrgs = await db
        .insert(organizations)
        .values({
          githubId: org.id.toString(),
          login: org.login,
          name: org.name,
          description: org.description,
          avatarUrl: org.avatar_url,
          htmlUrl: org.html_url,
          type: org.type,
          publicRepos: org.public_repos,
          publicGists: org.public_gists,
          followers: org.followers,
          following: org.following,
        })
        .onConflictDoUpdate({
          target: organizations.githubId,
          set: {
            name: org.name,
            description: org.description,
            avatarUrl: org.avatar_url,
            htmlUrl: org.html_url,
            publicRepos: org.public_repos,
            publicGists: org.public_gists,
            followers: org.followers,
            following: org.following,
            updatedAt: new Date(),
          },
        })
        .returning();

      if (!upsertedOrgs[0]) {
        throw new Error("Failed to upsert organization");
      }

      // Create membership relationship
      await db.insert(memberships).values({
        userId: session.user.id,
        organizationId: upsertedOrgs[0].id,
        role: org.type === "User" ? "owner" : "member",
      });

      addedCount++;
    }

    // Remove old memberships
    if (toRemoveGithubIds.length > 0) {
      const orgsToRemove = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(inArray(organizations.githubId, toRemoveGithubIds));

      if (orgsToRemove.length > 0) {
        const orgIdsToRemove = orgsToRemove.map((org) => org.id);

        await db
          .delete(memberships)
          .where(
            and(
              eq(memberships.userId, session.user.id),
              inArray(memberships.organizationId, orgIdsToRemove)
            )
          );

        removedCount = orgsToRemove.length;
      }
    }

    return NextResponse.json({
      success: true,
      added: addedCount,
      removed: removedCount,
      message: `Sync completed: ${addedCount} organizations added, ${removedCount} removed`,
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
