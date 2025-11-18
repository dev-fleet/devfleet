import { db } from "@/db";
import { ghOrganizations, repositories } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { components } from "@octokit/openapi-webhooks-types";
import { getAuthenticatedOctokit } from "./auth";

/**
 * Pick only the repository fields we need from the full GitHub repository type
 */
type RepositoryData = Pick<
  components["schemas"]["repository"],
  | "id"
  | "name"
  | "full_name"
  | "description"
  | "private"
  | "html_url"
  | "clone_url"
  | "ssh_url"
  | "default_branch"
  | "language"
  | "stargazers_count"
  | "forks_count"
  | "open_issues_count"
  | "visibility"
  | "archived"
  | "disabled"
>;

/**
 * Store or update a repository from GitHub App data
 */
export async function storeRepository(
  repositoryData: RepositoryData,
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
    console.error("Error storing repository:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetch and store all repositories for a GitHub App installation
 */
export async function syncRepositoriesFromInstallation(
  installationId: string,
  organizationId: string
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // Verify organization has GitHub app installation
    const organization = await db
      .select()
      .from(ghOrganizations)
      .where(eq(ghOrganizations.id, organizationId))
      .limit(1);

    if (!organization[0]?.githubAppInstallationId) {
      throw new Error("No GitHub app installation ID found for organization");
    }

    const octokit = await getAuthenticatedOctokit(installationId);

    let totalRepositories = 0;
    const iterator = octokit.paginate.iterator(
      octokit.rest.apps.listReposAccessibleToInstallation,
      {
        installation_id: parseInt(installationId),
        per_page: 100,
      }
    );

    for await (const response of iterator) {
      const repos = response.data;

      for (const repo of repos) {
        const storeResult = await storeRepository(
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
            `Failed to store repository: ${repo.full_name}`,
            storeResult.error
          );
        }
      }
    }

    console.log(
      `Synced ${totalRepositories} repositories for installation ${installationId}`
    );

    return { success: true, count: totalRepositories };
  } catch (error) {
    console.error("Error syncing repositories from installation:", error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
