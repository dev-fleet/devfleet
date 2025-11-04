import "server-only";

import { Octokit } from "octokit";
import { getSession } from "@/utils/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  ghOrganizations,
  NewGhOrganization,
  userGhOrganizationMemberships,
  users,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
// import { getGitHubAppInstallationAccessToken } from "@/lib/server/github";
import { env } from "@/env.mjs";
import { createAppAuth } from "@octokit/auth-app";
import { buildConflictUpdateColumns } from "@/db/helpers";

// export async function listRepos(): Promise<Repo[]> {
//   const session = await auth.api.getSession({
//     headers: await headers(),
//   });

//   const { accessToken } = await auth.api.getAccessToken({
//     body: {
//       providerId: "github",
//       userId: session?.user.id,
//     },
//     headers: await headers(),
//   });

//   if (!accessToken) {
//     throw new Error(
//       "No GitHub access token provided. Please authenticate first."
//     );
//   }

//   const octokit = new Octokit({
//     auth: accessToken,
//   });

//   try {
//     // Get user's own repositories and organizations in parallel
//     const [{ data: userRepositories }, { data: organizations }] =
//       await Promise.all([
//         octokit.rest.repos.listForAuthenticatedUser({
//           sort: "updated",
//           per_page: 100,
//           visibility: "all",
//           affiliation: "owner,collaborator,organization_member",
//         }),
//         octokit.rest.orgs.listForAuthenticatedUser({
//           per_page: 100,
//         }),
//       ]);

//     // Get repositories from each organization
//     const orgRepositoriesPromises = organizations.map(async (org) => {
//       try {
//         const { data: orgRepos } = await octokit.rest.repos.listForOrg({
//           org: org.login,
//           per_page: 100,
//           sort: "updated",
//         });
//         return orgRepos;
//       } catch (error) {
//         // If we can't access org repos (permissions), just return empty array
//         console.warn(`Could not fetch repos for org ${org.login}:`, error);
//         return [];
//       }
//     });

//     const orgRepositoriesArrays = await Promise.all(orgRepositoriesPromises);
//     const orgRepositories = orgRepositoriesArrays.flat();

//     // Combine and deduplicate repositories
//     const allRepositories = [...userRepositories, ...orgRepositories];
//     const uniqueRepositories = allRepositories.filter(
//       (repo, index, array) => array.findIndex((r) => r.id === repo.id) === index
//     );

//     return uniqueRepositories.map(
//       (repo): Repo => ({
//         id: repo.id,
//         name: repo.name,
//         full_name: repo.full_name,
//         private: repo.private,
//         description: repo.description,
//         html_url: repo.html_url,
//         default_branch: repo.default_branch || "main",
//         updated_at: repo.updated_at || null,
//         language: repo.language || null,
//         stargazers_count: repo.stargazers_count || 0,
//         forks_count: repo.forks_count || 0,
//       })
//     );
//   } catch (error) {
//     console.error("GitHub API Error:", error);
//     throw new Error(
//       `Failed to fetch repositories: ${error instanceof Error ? error.message : "Unknown error"}`
//     );
//   }
// }

// export async function getBranches(
//   owner: string,
//   repo: string,
//   organizationId: string
// ) {
//   try {
//     // Get current user session
//     const session = await auth.api.getSession({
//       headers: await headers(),
//     });

//     if (!session?.user.id) {
//       throw new Error("Unauthorized: No active session");
//     }

//     // Check if user has access to the organization and get organization data
//     const userMembership = await db
//       .select({
//         githubAppInstallationId: organizations.githubAppInstallationId,
//       })
//       .from(memberships)
//       .innerJoin(
//         organizations,
//         eq(memberships.organizationId, organizations.id)
//       )
//       .where(
//         and(
//           eq(memberships.userId, session.user.id),
//           eq(organizations.id, organizationId)
//         )
//       )
//       .limit(1);

//     if (userMembership.length === 0) {
//       throw new Error(
//         "Unauthorized: User does not have access to this organization"
//       );
//     }

//     if (!userMembership[0]?.githubAppInstallationId) {
//       throw new Error("No GitHub app installation ID found for organization");
//     }

//     const octokit = new Octokit({
//       authStrategy: createAppAuth,
//       auth: {
//         appId: env.GITHUB_APP_ID,
//         privateKey: Buffer.from(env.GITHUB_APP_PRIVATE_KEY, "base64").toString(
//           "utf8"
//         ),
//         installationId: userMembership[0].githubAppInstallationId,
//       },
//     });

//     const { data } = await octokit.rest.repos.listBranches({
//       owner,
//       repo,
//     });

//     return data.map((branch) => ({
//       name: branch.name,
//       protected: branch.protected,
//     }));
//   } catch (error) {
//     console.error("GitHub API Error:", error);
//     throw new Error(
//       `Failed to fetch branches: ${error instanceof Error ? error.message : "Unknown error"}`
//     );
//   }
// }

// export async function createRepo({
//   repoName,
//   token,
//   isPrivate = true,
// }: {
//   repoName: string;
//   token: string;
//   isPrivate?: boolean;
// }) {
//   if (!token) {
//     throw new Error(
//       "No GitHub access token provided. Please authenticate first."
//     );
//   }

//   const octokit = new Octokit({
//     auth: token,
//   });

//   try {
//     const { data } = await octokit.rest.repos.createForAuthenticatedUser({
//       name: repoName,
//       private: isPrivate,
//     });

//     return {
//       full_name: data.full_name,
//       private: data.private,
//       description: data.description,
//       html_url: data.html_url,
//       default_branch: data.default_branch || "main",
//       created_at: data.created_at || null,
//       language: data.language || null,
//       stargazers_count: data.stargazers_count || 0,
//       forks_count: data.forks_count || 0,
//     };
//   } catch (error) {
//     console.error("GitHub API Error:", error);
//     throw new Error(
//       `Failed to create repository: ${error instanceof Error ? error.message : "Unknown error"}`
//     );
//   }
// }

// TODO: Add role fetching later.
// TODO: Better Auth drizzle adapter can't handle transactions. Needs investigation.
export async function syncUserOrgsAndMemberships(
  userId: string,
  accessToken: string
) {
  if (!accessToken) {
    throw new Error("No GitHub access token provided");
  }

  const octokit = new Octokit({
    auth: accessToken,
  });

  try {
    // Get user's personal info (this counts as their "personal organization")
    const { data: user } = await octokit.rest.users.getAuthenticated();

    // Get user's organizations
    const { data: organizations } =
      await octokit.rest.orgs.listForAuthenticatedUser({
        per_page: 100,
      });

    const allOrganizations: NewGhOrganization[] = [
      // Add user's personal organization
      {
        organizationId: user.id.toString(),
        organizationType: "USER" as const,
        login: user.login,
        displayName: user.name || user.login,
        avatarUrl: user.avatar_url,
      },
      // Add actual organizations
      ...organizations.map((org) => ({
        organizationId: org.id.toString(),
        organizationType: "ORG" as const,
        login: org.login,
        displayName: org.login,
        avatarUrl: org.avatar_url,
      })),
    ];

    const upsertedGhOrganizations = await db.transaction(async (tx) => {
      // Bulk insert with onConflictDoUpdate
      await tx
        .insert(ghOrganizations)
        .values(allOrganizations)
        .onConflictDoUpdate({
          target: ghOrganizations.organizationId,
          set: buildConflictUpdateColumns(ghOrganizations, [
            "organizationType",
            "login",
            "displayName",
            "avatarUrl",
          ]),
        });

      // Return canonical rows so we have their internal IDs for membership upserts
      const canonical = await tx
        .select()
        .from(ghOrganizations)
        .where(
          inArray(
            ghOrganizations.login,
            allOrganizations.map((org) => org.login)
          )
        );
      return canonical;
    });

    // Upsert memberships
    await db.transaction(async (tx) => {
      const rows = upsertedGhOrganizations.map((org) => ({
        userId: userId,
        ghOrganizationId: org.id,
        role:
          org.organizationType === "USER"
            ? ("OWNER" as const)
            : ("MEMBER" as const),
      }));

      await tx.insert(userGhOrganizationMemberships).values(rows);
    });

    // If the user doesn't have a default GitHub organization yet,
    // set it to their personal (USER) organization
    const currentUser = await db
      .select({ defaultGhOrganizationId: users.defaultGhOrganizationId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!currentUser[0]?.defaultGhOrganizationId) {
      const userPersonalOrg = upsertedGhOrganizations.find(
        (org) => org.organizationType === "USER"
      );

      if (userPersonalOrg) {
        await db
          .update(users)
          .set({
            defaultGhOrganizationId: userPersonalOrg.id,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
      }
    }
  } catch (error) {
    console.error("GitHub API Error:", error);
    throw new Error(
      `Failed to sync user organizations and memberships: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// export async function storeUserOrganizations(
//   userId: string,
//   accessToken: string
// ) {
//   try {
//     // Fetch organizations from GitHub
//     const orgs = await fetchUserOrganizations(accessToken);

//     // Store organizations and create user-organization relationships
//     for (const org of orgs) {
//       // Check if organization already exists
//       const existingOrg = await db
//         .select()
//         .from(organizations)
//         .where(eq(organizations.githubId, org.id.toString()))
//         .limit(1);

//       let organizationId: string;

//       if (existingOrg.length === 0) {
//         // Create new organization
//         const newOrgs = await db
//           .insert(organizations)
//           .values({
//             githubId: org.id.toString(),
//             login: org.login,
//             name: org.name,
//             description: org.description,
//             avatarUrl: org.avatar_url,
//             htmlUrl: org.html_url,
//             type: org.type,
//             publicRepos: org.public_repos,
//             publicGists: org.public_gists,
//             followers: org.followers,
//             following: org.following,
//           })
//           .returning();

//         if (!newOrgs[0]) {
//           throw new Error("Failed to create organization");
//         }
//         organizationId = newOrgs[0].id;
//       } else {
//         // Update existing organization
//         const updatedOrgs = await db
//           .update(organizations)
//           .set({
//             name: org.name,
//             description: org.description,
//             avatarUrl: org.avatar_url,
//             htmlUrl: org.html_url,
//             publicRepos: org.public_repos,
//             publicGists: org.public_gists,
//             followers: org.followers,
//             following: org.following,
//             updatedAt: new Date(),
//           })
//           .where(eq(organizations.githubId, org.id.toString()))
//           .returning();

//         if (!updatedOrgs[0]) {
//           throw new Error("Failed to update organization");
//         }
//         organizationId = updatedOrgs[0].id;
//       }

//       // Check if membership relationship exists
//       const existingMembership = await db
//         .select()
//         .from(memberships)
//         .where(
//           and(
//             eq(memberships.userId, userId),
//             eq(memberships.organizationId, organizationId)
//           )
//         )
//         .limit(1);

//       if (existingMembership.length === 0) {
//         // Create membership relationship
//         await db.insert(memberships).values({
//           userId,
//           organizationId,
//           role: org.type === "User" ? "owner" : "member", // Assume owner for personal, member for orgs
//         });
//       }
//     }

//     return { success: true, count: orgs.length };
//   } catch (error) {
//     console.error("Error storing user organizations:", error);
//     throw new Error(
//       `Failed to store organizations: ${error instanceof Error ? error.message : "Unknown error"}`
//     );
//   }
// }

// export async function getUserOrganizations(userId: string) {
//   try {
//     const userOrgs = await db
//       .select({
//         id: organizations.id,
//         githubId: organizations.githubId,
//         login: organizations.login,
//         name: organizations.name,
//         description: organizations.description,
//         avatarUrl: organizations.avatarUrl,
//         htmlUrl: organizations.htmlUrl,
//         type: organizations.type,
//         publicRepos: organizations.publicRepos,
//         publicGists: organizations.publicGists,
//         followers: organizations.followers,
//         following: organizations.following,
//         role: memberships.role,
//         joinedAt: memberships.createdAt,
//       })
//       .from(memberships)
//       .innerJoin(
//         organizations,
//         eq(memberships.organizationId, organizations.id)
//       )
//       .where(eq(memberships.userId, userId))
//       .orderBy(organizations.type, organizations.login);

//     return userOrgs;
//   } catch (error) {
//     console.error("Error fetching user organizations:", error);
//     throw new Error(
//       `Failed to fetch user organizations: ${error instanceof Error ? error.message : "Unknown error"}`
//     );
//   }
// }

// // GitHub App Installation Functions
// export async function getGitHubAppInstallations(organizationId: string) {
//   try {
//     const installations = await db
//       .select({
//         repositoryId: repositories.id,
//         repositoryName: repositories.name,
//         repositoryFullName: repositories.fullName,
//         repositoryDescription: repositories.description,
//         repositoryPrivate: repositories.private,
//         repositoryHtmlUrl: repositories.htmlUrl,
//         repositoryLanguage: repositories.language,
//         repositoryStargazersCount: repositories.stargazersCount,
//         repositoryForksCount: repositories.forksCount,
//         repositoryDefaultBranch: repositories.defaultBranch,
//         repositoryVisibility: repositories.visibility,
//         repositoryArchived: repositories.archived,
//         repositoryDisabled: repositories.disabled,
//         repositoryPushedAt: repositories.pushedAt,
//         repositoryUpdatedAt: repositories.updatedAt,
//       })
//       .from(repositories)
//       .where(eq(repositories.organizationId, organizationId))
//       .orderBy(repositories.name);

//     return installations;
//   } catch (error) {
//     console.error("Error fetching GitHub app installations:", error);
//     throw new Error(
//       `Failed to fetch GitHub app installations: ${error instanceof Error ? error.message : "Unknown error"}`
//     );
//   }
// }

// export async function fetchRepositoriesFromGitHubApp(
//   installationId: string,
//   organizationId: string
// ): Promise<{ success: boolean; count: number; error?: string }> {
//   try {
//     // Get the organization to access the GitHub app installation ID
//     const organization = await db
//       .select()
//       .from(organizations)
//       .where(eq(organizations.id, organizationId))
//       .limit(1);

//     if (!organization[0]?.githubAppInstallationId) {
//       throw new Error("No GitHub app installation ID found for organization");
//     }

//     // Get the GitHub App installation access token using JWT strategy
//     const installationToken =
//       await getGitHubAppInstallationAccessToken(installationId);

//     // Create Octokit instance with the installation access token
//     const octokit = new Octokit({
//       auth: installationToken,
//     });

//     let totalRepositories = 0;
//     const iterator = octokit.paginate.iterator(
//       octokit.rest.apps.listReposAccessibleToInstallation,
//       {
//         installation_id: parseInt(installationId),
//         per_page: 100,
//       }
//     );

//     for await (const response of iterator) {
//       const repositories = response.data;

//       for (const repo of repositories) {
//         // Store each repository in the database
//         const storeResult = await storeRepositoryFromGitHubApp(
//           {
//             id: repo.id,
//             name: repo.name,
//             full_name: repo.full_name,
//             description: repo.description,
//             private: repo.private,
//             html_url: repo.html_url,
//             clone_url: repo.clone_url,
//             ssh_url: repo.ssh_url,
//             default_branch: repo.default_branch || "main",
//             language: repo.language,
//             stargazers_count: repo.stargazers_count || 0,
//             forks_count: repo.forks_count || 0,
//             open_issues_count: repo.open_issues_count || 0,
//             visibility: repo.visibility || "private",
//             archived: repo.archived || false,
//             disabled: repo.disabled || false,
//             pushed_at: repo.pushed_at,
//           },
//           organizationId
//         );

//         if (storeResult.success) {
//           totalRepositories++;
//         } else {
//           console.error(
//             "Failed to store repository:",
//             repo.full_name,
//             storeResult.error
//           );
//         }
//       }
//     }

//     console.log(
//       `Successfully fetched and stored ${totalRepositories} repositories for installation ${installationId}`
//     );

//     return { success: true, count: totalRepositories };
//   } catch (error) {
//     console.error("Error fetching repositories from GitHub App:", error);
//     return {
//       success: false,
//       count: 0,
//       error: error instanceof Error ? error.message : "Unknown error",
//     };
//   }
// }

// export async function storeRepositoryFromGitHubApp(
//   repositoryData: {
//     id: number;
//     name: string;
//     full_name: string;
//     description: string | null;
//     private: boolean;
//     html_url: string;
//     clone_url: string;
//     ssh_url: string;
//     default_branch: string;
//     language: string | null;
//     stargazers_count: number;
//     forks_count: number;
//     open_issues_count: number;
//     visibility: string;
//     archived: boolean;
//     disabled: boolean;
//     pushed_at: string | null;
//   },
//   organizationId: string
// ): Promise<{ success: boolean; repositoryId?: string; error?: string }> {
//   try {
//     const [repository] = await db
//       .insert(repositories)
//       .values({
//         githubId: repositoryData.id.toString(),
//         name: repositoryData.name,
//         fullName: repositoryData.full_name,
//         description: repositoryData.description,
//         private: repositoryData.private,
//         htmlUrl: repositoryData.html_url,
//         cloneUrl: repositoryData.clone_url,
//         sshUrl: repositoryData.ssh_url,
//         defaultBranch: repositoryData.default_branch,
//         language: repositoryData.language,
//         stargazersCount: repositoryData.stargazers_count,
//         forksCount: repositoryData.forks_count,
//         openIssuesCount: repositoryData.open_issues_count,
//         visibility: repositoryData.visibility,
//         archived: repositoryData.archived,
//         disabled: repositoryData.disabled,
//         pushedAt: repositoryData.pushed_at
//           ? new Date(repositoryData.pushed_at)
//           : null,
//         organizationId: organizationId,
//       })
//       .onConflictDoUpdate({
//         target: repositories.githubId,
//         set: {
//           name: repositoryData.name,
//           fullName: repositoryData.full_name,
//           description: repositoryData.description,
//           private: repositoryData.private,
//           htmlUrl: repositoryData.html_url,
//           cloneUrl: repositoryData.clone_url,
//           sshUrl: repositoryData.ssh_url,
//           defaultBranch: repositoryData.default_branch,
//           language: repositoryData.language,
//           stargazersCount: repositoryData.stargazers_count,
//           forksCount: repositoryData.forks_count,
//           openIssuesCount: repositoryData.open_issues_count,
//           visibility: repositoryData.visibility,
//           archived: repositoryData.archived,
//           disabled: repositoryData.disabled,
//           pushedAt: repositoryData.pushed_at
//             ? new Date(repositoryData.pushed_at)
//             : null,
//           organizationId: organizationId,
//           updatedAt: new Date(),
//         },
//       })
//       .returning();

//     if (!repository) {
//       throw new Error("Failed to upsert repository");
//     }

//     return { success: true, repositoryId: repository.id };
//   } catch (error) {
//     console.error("Error storing repository from GitHub App:", error);
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "Unknown error",
//     };
//   }
// }

// export async function getOrganizationRepositories(organizationId: string) {
//   try {
//     const repos = await db
//       .select({
//         id: repositories.id,
//         githubId: repositories.githubId,
//         name: repositories.name,
//         fullName: repositories.fullName,
//         description: repositories.description,
//         private: repositories.private,
//         htmlUrl: repositories.htmlUrl,
//         cloneUrl: repositories.cloneUrl,
//         sshUrl: repositories.sshUrl,
//         defaultBranch: repositories.defaultBranch,
//         language: repositories.language,
//         stargazersCount: repositories.stargazersCount,
//         forksCount: repositories.forksCount,
//         openIssuesCount: repositories.openIssuesCount,
//         visibility: repositories.visibility,
//         archived: repositories.archived,
//         disabled: repositories.disabled,
//         pushedAt: repositories.pushedAt,
//         updatedAt: repositories.updatedAt,
//         connectedAt: repositories.createdAt,
//       })
//       .from(repositories)
//       .where(eq(repositories.organizationId, organizationId))
//       .orderBy(repositories.name);

//     return repos;
//   } catch (error) {
//     console.error("Error fetching organization repositories:", error);
//     throw new Error(
//       `Failed to fetch organization repositories: ${error instanceof Error ? error.message : "Unknown error"}`
//     );
//   }
// }

// export async function getOrganizationEnvironments(organizationId: string) {
//   try {
//     const envs = await db
//       .select({
//         id: environments.id,
//         name: environments.name,
//         description: environments.description,
//         organizationId: environments.organizationId,
//         defaultBaseBranch: environments.defaultBaseBranch,
//         repositoryName: environments.repositoryName,
//         repositoryId: environments.repositoryId,
//         createdAt: environments.createdAt,
//         updatedAt: environments.updatedAt,
//         // Include repository details
//         repository: {
//           id: repositories.id,
//           githubId: repositories.githubId,
//           name: repositories.name,
//           fullName: repositories.fullName,
//           description: repositories.description,
//           private: repositories.private,
//           htmlUrl: repositories.htmlUrl,
//           cloneUrl: repositories.cloneUrl,
//           sshUrl: repositories.sshUrl,
//           defaultBranch: repositories.defaultBranch,
//           language: repositories.language,
//           stargazersCount: repositories.stargazersCount,
//           forksCount: repositories.forksCount,
//           openIssuesCount: repositories.openIssuesCount,
//           visibility: repositories.visibility,
//           archived: repositories.archived,
//           disabled: repositories.disabled,
//           pushedAt: repositories.pushedAt,
//           updatedAt: repositories.updatedAt,
//         },
//       })
//       .from(environments)
//       .innerJoin(repositories, eq(environments.repositoryId, repositories.id))
//       .where(eq(environments.organizationId, organizationId))
//       .orderBy(environments.name);

//     return envs;
//   } catch (error) {
//     console.error("Error fetching organization environments:", error);
//     throw new Error(
//       `Failed to fetch organization environments: ${error instanceof Error ? error.message : "Unknown error"}`
//     );
//   }
// }

// export async function createEnvironment({
//   name,
//   description,
//   repositoryId,
//   organizationId,
//   defaultBaseBranch,
// }: {
//   name: string;
//   description?: string;
//   repositoryId: string;
//   organizationId: string;
//   defaultBaseBranch?: string;
// }) {
//   try {
//     const session = await auth.api.getSession({
//       headers: await headers(),
//     });

//     if (!session) {
//       throw new Error("Not authenticated");
//     }

//     // Check if user has access to the organization and get user onboarding info
//     const userMembershipData = await db
//       .select({
//         userId: users.id,
//         onboardingStep: users.onboardingStep,
//         organizationId: organizations.id,
//       })
//       .from(memberships)
//       .innerJoin(
//         organizations,
//         eq(memberships.organizationId, organizations.id)
//       )
//       .innerJoin(users, eq(memberships.userId, users.id))
//       .where(
//         and(
//           eq(memberships.userId, session.user.id),
//           eq(organizations.id, organizationId)
//         )
//       )
//       .limit(1);

//     if (userMembershipData.length === 0) {
//       throw new Error(
//         "Unauthorized: User does not have access to this organization"
//       );
//     }

//     const userData = userMembershipData[0]!;

//     // Get repository details to set repository name
//     const repository = await db
//       .select()
//       .from(repositories)
//       .where(eq(repositories.id, repositoryId))
//       .limit(1);

//     if (!repository[0]) {
//       throw new Error("Repository not found");
//     }

//     const newEnvironment = await db
//       .insert(environments)
//       .values({
//         name,
//         description,
//         organizationId,
//         repositoryId,
//         repositoryName: repository[0].name,
//         defaultBaseBranch: defaultBaseBranch || repository[0].defaultBranch,
//         createdBy: session.user.id,
//       })
//       .returning();

//     // Check if user's onboarding step is 'environment' and advance to 'agent'
//     if (userData.onboardingStep === "environment") {
//       await db
//         .update(users)
//         .set({
//           onboardingStep: "agent",
//           updatedAt: new Date(),
//         })
//         .where(eq(users.id, session.user.id));
//     }

//     return newEnvironment[0];
//   } catch (error) {
//     console.error("Error creating environment:", error);
//     throw new Error(
//       `Failed to create environment: ${error instanceof Error ? error.message : "Unknown error"}`
//     );
//   }
// }

// export async function updateEnvironment({
//   id,
//   name,
//   description,
//   defaultBaseBranch,
// }: {
//   id: string;
//   name: string;
//   description?: string | null;
//   defaultBaseBranch?: string;
// }) {
//   try {
//     const session = await auth.api.getSession({
//       headers: await headers(),
//     });

//     if (!session) {
//       throw new Error("Not authenticated");
//     }

//     // Check if user has access to this environment
//     const environment = await db
//       .select({
//         id: environments.id,
//         organizationId: environments.organizationId,
//       })
//       .from(environments)
//       .where(eq(environments.id, id))
//       .limit(1);

//     if (!environment[0]) {
//       throw new Error("Environment not found");
//     }

//     // Check if user has access to the organization
//     const userAccess = await db
//       .select()
//       .from(users)
//       .where(
//         and(
//           eq(users.id, session.user.id),
//           eq(users.activeOrganizationId, environment[0].organizationId)
//         )
//       )
//       .limit(1);

//     if (userAccess.length === 0) {
//       throw new Error("Access denied to this environment");
//     }

//     const updatedEnvironment = await db
//       .update(environments)
//       .set({
//         name,
//         description,
//         defaultBaseBranch,
//         updatedAt: new Date(),
//       })
//       .where(eq(environments.id, id))
//       .returning();

//     return updatedEnvironment[0];
//   } catch (error) {
//     console.error("Error updating environment:", error);
//     throw new Error(
//       `Failed to update environment: ${error instanceof Error ? error.message : "Unknown error"}`
//     );
//   }
// }

// export async function deleteEnvironment(id: string) {
//   try {
//     const session = await auth.api.getSession({
//       headers: await headers(),
//     });

//     if (!session) {
//       throw new Error("Not authenticated");
//     }

//     // Check if user has access to this environment
//     const environment = await db
//       .select({
//         id: environments.id,
//         organizationId: environments.organizationId,
//         name: environments.name,
//       })
//       .from(environments)
//       .where(eq(environments.id, id))
//       .limit(1);

//     if (!environment[0]) {
//       throw new Error("Environment not found");
//     }

//     // Check if user has access to the organization
//     const userAccess = await db
//       .select()
//       .from(users)
//       .where(
//         and(
//           eq(users.id, session.user.id),
//           eq(users.activeOrganizationId, environment[0].organizationId)
//         )
//       )
//       .limit(1);

//     if (userAccess.length === 0) {
//       throw new Error("Access denied to this environment");
//     }

//     await db.delete(environments).where(eq(environments.id, id));

//     return { success: true };
//   } catch (error) {
//     console.error("Error deleting environment:", error);
//     throw new Error(
//       `Failed to delete environment: ${error instanceof Error ? error.message : "Unknown error"}`
//     );
//   }
// }
