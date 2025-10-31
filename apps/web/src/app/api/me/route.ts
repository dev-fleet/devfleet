import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { users, organizations, memberships } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user with active organization
    const user = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        role: users.role,
        activeOrganizationId: users.activeOrganizationId,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let activeOrganization = null;

    // If user has an active organization set, fetch it
    if (user[0].activeOrganizationId) {
      const activeOrg = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, user[0].activeOrganizationId))
        .limit(1);

      activeOrganization = activeOrg[0] || null;
    }

    // If no active organization is set, set a default one
    if (!activeOrganization) {
      const userOrgs = await db
        .select()
        .from(organizations)
        .innerJoin(
          memberships,
          eq(memberships.organizationId, organizations.id)
        )
        .where(eq(memberships.userId, session.user.id))
        .orderBy(organizations.type, organizations.login);

      if (userOrgs.length > 0) {
        // Prefer personal organization, otherwise use the first one
        const personalOrg = userOrgs.find(
          (org) => org.organizations.type === "User"
        );
        const defaultOrg =
          personalOrg?.organizations || userOrgs[0]?.organizations;

        if (defaultOrg) {
          // Update the user's active organization
          await db
            .update(users)
            .set({
              activeOrganizationId: defaultOrg.id,
              updatedAt: new Date(),
            })
            .where(eq(users.id, session.user.id));

          activeOrganization = defaultOrg;
        }
      }
    }

    return NextResponse.json({
      ...user[0],
      activeOrganization,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
