import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";
import { env } from "@/env.mjs";
import { db } from "@/db";
import { ghOrganizations } from "@/db/schema";
import { eq } from "drizzle-orm";

export class GitHubInstallationNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubInstallationNotFoundError";
  }
}

export class GitHubDisconnectedError extends Error {
  public reason: string;

  constructor(message: string, reason: string) {
    super(message);
    this.name = "GitHubDisconnectedError";
    this.reason = reason;
  }
}

/**
 * Validate GitHub installation is connected and active
 */
async function validateInstallation(installationId: string | number) {
  const orgs = await db
    .select({
      connectionStatus: ghOrganizations.githubAppConnectionStatus,
      reason: ghOrganizations.githubAppDisconnectedReason,
    })
    .from(ghOrganizations)
    .where(
      eq(ghOrganizations.githubAppInstallationId, installationId.toString())
    )
    .limit(1);

  if (orgs.length === 0) {
    throw new GitHubInstallationNotFoundError(
      `No organization found for installation ID: ${installationId}`
    );
  }

  const org = orgs[0]!;
  if (org.connectionStatus === "disconnected") {
    throw new GitHubDisconnectedError(
      `GitHub App is disconnected: ${org.reason || "unknown reason"}`,
      org.reason || "unknown"
    );
  }
}

/**
 * Get GitHub App installation access token
 * @throws {GitHubInstallationNotFoundError} If installation not found
 * @throws {GitHubDisconnectedError} If GitHub App is disconnected
 */
export async function getGitHubAppInstallationAccessToken(
  installationId: string | number,
  repositories?: string[]
) {
  // Validate installation before attempting to get token
  await validateInstallation(installationId);

  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: env.GITHUB_APP_ID,
      privateKey: Buffer.from(env.GITHUB_APP_PRIVATE_KEY, "base64").toString(
        "utf8"
      ),
      installationId: installationId.toString(),
    },
  });

  try {
    const {
      data: { token },
    } = await octokit.rest.apps.createInstallationAccessToken({
      installation_id:
        typeof installationId === "string"
          ? parseInt(installationId)
          : installationId,
      repositories,
    });

    return token;
  } catch (error) {
    // If token creation fails, mark as disconnected
    console.error("Failed to create installation access token:", error);

    // Update organization as disconnected
    await db
      .update(ghOrganizations)
      .set({
        githubAppConnectionStatus: "disconnected",
        githubAppDisconnectedAt: new Date(),
        githubAppDisconnectedReason: "permission_revoked",
        updatedAt: new Date(),
      })
      .where(
        eq(ghOrganizations.githubAppInstallationId, installationId.toString())
      );

    throw new GitHubDisconnectedError(
      "Failed to create GitHub installation access token",
      "permission_revoked"
    );
  }
}

/**
 * Create an authenticated Octokit instance for a GitHub App installation
 * @throws {GitHubInstallationNotFoundError} If installation not found
 * @throws {GitHubDisconnectedError} If GitHub App is disconnected
 */
export async function getAuthenticatedOctokit(
  installationId: string | number,
  repositories?: string[]
): Promise<Octokit> {
  const token = await getGitHubAppInstallationAccessToken(
    installationId,
    repositories
  );
  return new Octokit({ auth: token });
}
