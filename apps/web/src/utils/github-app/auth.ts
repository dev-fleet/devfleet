import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";
import { env } from "@/env.mjs";

/**
 * Get GitHub App installation access token
 */
export async function getGitHubAppInstallationAccessToken(
  installationId: string | number,
  repositories?: string[]
) {
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
}

/**
 * Create an authenticated Octokit instance for a GitHub App installation
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
