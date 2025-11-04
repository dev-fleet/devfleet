import { db } from "@/db";
import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";
import { ghOrganizations, repositories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { env } from "@/env.mjs";

async function getGitHubAppInstallationAccessToken(
  installationId: string,
  repositories?: string[]
) {
  const app = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: env.GITHUB_APP_ID,
      privateKey: Buffer.from(env.GITHUB_APP_PRIVATE_KEY, "base64").toString(
        "utf8"
      ),
      installationId,
    },
  });

  const {
    data: { token },
  } = await app.rest.apps.createInstallationAccessToken({
    installation_id: parseInt(installationId),
    repositories,
  });

  return token;
}

export async function storeRepositoryFromGitHubApp(
  repositoryData: {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    private: boolean;
    html_url: string;
    clone_url: string;
    ssh_url: string;
    default_branch: string;
    language: string | null;
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    visibility: string;
    archived: boolean;
    disabled: boolean;
  },
  organizationId: string
): Promise<{ success: boolean; repositoryId?: string; error?: string }> {
  try {
    const [repository] = await db
      .insert(repositories)
      .values({
        githubId: repositoryData.id.toString(),
        name: repositoryData.name,
        fullName: repositoryData.full_name,
        description: repositoryData.description,
        private: repositoryData.private,
        htmlUrl: repositoryData.html_url,
        cloneUrl: repositoryData.clone_url,
        sshUrl: repositoryData.ssh_url,
        defaultBranch: repositoryData.default_branch,
        language: repositoryData.language,
        stargazersCount: repositoryData.stargazers_count,
        forksCount: repositoryData.forks_count,
        openIssuesCount: repositoryData.open_issues_count,
        visibility: repositoryData.visibility,
        archived: repositoryData.archived,
        disabled: repositoryData.disabled,
        ownerGhOrganizationId: organizationId,
      })
      .onConflictDoUpdate({
        target: repositories.githubId,
        set: {
          name: repositoryData.name,
          fullName: repositoryData.full_name,
          description: repositoryData.description,
          private: repositoryData.private,
          htmlUrl: repositoryData.html_url,
          cloneUrl: repositoryData.clone_url,
          sshUrl: repositoryData.ssh_url,
          defaultBranch: repositoryData.default_branch,
          language: repositoryData.language,
          stargazersCount: repositoryData.stargazers_count,
          forksCount: repositoryData.forks_count,
          openIssuesCount: repositoryData.open_issues_count,
          visibility: repositoryData.visibility,
          archived: repositoryData.archived,
          disabled: repositoryData.disabled,
          ownerGhOrganizationId: organizationId,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!repository) {
      throw new Error("Failed to upsert repository");
    }

    return { success: true, repositoryId: repository.id };
  } catch (error) {
    console.error("Error storing repository from GitHub App:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function fetchRepositoriesFromGitHubApp(
  installationId: string,
  organizationId: string
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // Get the organization to access the GitHub app installation ID
    const organization = await db
      .select()
      .from(ghOrganizations)
      .where(eq(ghOrganizations.id, organizationId))
      .limit(1);

    if (!organization[0]?.githubAppInstallationId) {
      throw new Error("No GitHub app installation ID found for organization");
    }

    // Get the GitHub App installation access token using JWT strategy
    const installationToken =
      await getGitHubAppInstallationAccessToken(installationId);

    // Create Octokit instance with the installation access token
    const octokit = new Octokit({
      auth: installationToken,
    });

    let totalRepositories = 0;
    const iterator = octokit.paginate.iterator(
      octokit.rest.apps.listReposAccessibleToInstallation,
      {
        installation_id: parseInt(installationId),
        per_page: 100,
      }
    );

    for await (const response of iterator) {
      const repositories = response.data;

      for (const repo of repositories) {
        // Store each repository in the database
        const storeResult = await storeRepositoryFromGitHubApp(
          {
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description,
            private: repo.private,
            html_url: repo.html_url,
            clone_url: repo.clone_url,
            ssh_url: repo.ssh_url,
            default_branch: repo.default_branch || "main",
            language: repo.language,
            stargazers_count: repo.stargazers_count || 0,
            forks_count: repo.forks_count || 0,
            open_issues_count: repo.open_issues_count || 0,
            visibility: repo.visibility || "private",
            archived: repo.archived || false,
            disabled: repo.disabled || false,
          },
          organizationId
        );

        if (storeResult.success) {
          totalRepositories++;
        } else {
          console.error(
            "Failed to store repository:",
            repo.full_name,
            storeResult.error
          );
        }
      }
    }

    console.log(
      `Successfully fetched and stored ${totalRepositories} repositories for installation ${installationId}`
    );

    return { success: true, count: totalRepositories };
  } catch (error) {
    console.error("Error fetching repositories from GitHub App:", error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
