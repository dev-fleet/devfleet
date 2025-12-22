import { db } from "@/db";
import { env } from "@/env.mjs";
import { getSession } from "@/utils/auth";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { Octokit, OAuthApp } from "octokit";
import { ghOrganizations, users, repoAgents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { syncRepositoriesFromInstallation } from "@/utils/github-app/repositories";
import { withAuth } from "@/utils/middleware";

export const GET = withAuth(async (req) => {
  // Parse the URL to get query parameters
  const { searchParams } = new URL(req.url);

  const installationId = searchParams.get("installation_id");
  const code = searchParams.get("code");

  if (!installationId || !code) {
    return NextResponse.json(
      { message: "Missing installation_id or code" },
      { status: 400 }
    );
  }

  // Get the active organization ID
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, req.auth.userId))
    .limit(1);

  const activeOrganizationId = user[0]?.defaultGhOrganizationId;

  // This should never happen but just in case
  if (!activeOrganizationId) {
    return NextResponse.json(
      { message: "No active organization" },
      { status: 400 }
    );
  }

  // Check if the organization already has GitHub app credentials
  const organization = await db
    .select()
    .from(ghOrganizations)
    .where(eq(ghOrganizations.id, activeOrganizationId))
    .limit(1);

  // Detect reconnection scenario
  const isReconnection = organization[0]?.githubAppConnectionStatus === "disconnected";

  // Allow reconnection if disconnected, but block if already connected
  if (
    (organization[0]?.githubAppInstallationId ||
      organization[0]?.githubAppAccessToken) &&
    organization[0]?.githubAppConnectionStatus === "connected"
  ) {
    return NextResponse.json(
      { message: "GitHub is already connected to this organization" },
      { status: 400 }
    );
  }

  try {
    const oauthApp = new OAuthApp({
      clientId: env.GITHUB_APP_CLIENT_ID,
      clientSecret: env.GITHUB_APP_CLIENT_SECRET,
    });

    const { authentication } = await oauthApp.createToken({ code });
    const accessToken = authentication.token;

    const octokit = new Octokit({
      auth: accessToken,
    });

    let isValidInstallation = false;
    const iterator = octokit.paginate.iterator(
      octokit.rest.apps.listInstallationsForAuthenticatedUser
    );

    for await (const response of iterator) {
      const installations = response.data;

      for (const installation of installations) {
        if (installation.id === parseInt(installationId)) {
          isValidInstallation = true;
          break;
        }
      }
      if (isValidInstallation) break;
    }

    if (!isValidInstallation) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Save the GitHub app installation ID to the organization
    await db
      .update(ghOrganizations)
      .set({
        githubAppInstallationId: installationId,
        // Set connection status to connected
        githubAppConnectionStatus: "connected",
        githubAppDisconnectedAt: null,
        githubAppDisconnectedReason: null,
        updatedAt: new Date(),
      })
      .where(eq(ghOrganizations.id, activeOrganizationId));

    // Re-enable agents that were disabled due to GitHub disconnection
    if (isReconnection) {
      await db
        .update(repoAgents)
        .set({
          enabled: true,
          disabledDueToGithubDisconnect: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(repoAgents.ownerGhOrganizationId, activeOrganizationId),
            eq(repoAgents.disabledDueToGithubDisconnect, true)
          )
        );
    }

    // Fetch all repositories the GitHub app has access to and save them to database
    const fetchResult = await syncRepositoriesFromInstallation(
      installationId,
      activeOrganizationId
    );

    if (!fetchResult.success) {
      console.error("Failed to fetch repositories:", fetchResult.error);
      // Don't fail the entire process if repository fetching fails
      // The installation is still saved successfully
    }

    // Check if user's current onboarding step is 'github' and update to 'agent'
    if (user[0]?.onboardingStep === "github") {
      await db
        .update(users)
        .set({
          onboardingStep: "agent",
          updatedAt: new Date(),
        })
        .where(eq(users.id, user[0]?.id));
    }

    // Redirect appropriately based on whether this is a reconnection or new installation
    const redirectUrl = isReconnection
      ? `${env.NEXT_PUBLIC_URL}/dashboard`
      : `${env.NEXT_PUBLIC_URL}/onboarding`;

    return NextResponse.redirect(new URL(redirectUrl));
  } catch (error: unknown) {
    console.error(
      "Error during verification:",
      error instanceof Error ? error.message : String(error)
    );
    return NextResponse.json(
      { message: "An error occurred during verification." },
      { status: 500 }
    );
  }
});
