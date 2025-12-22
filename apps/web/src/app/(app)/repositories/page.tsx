import { InsetHeader } from "@/components/sidebar/inset-header";
import { ReposTableClient } from "./repos-table-client";
import { GitHubDisconnectedEmptyState } from "@/components/github-disconnected-empty-state";
import { getSession } from "@/utils/auth";
import { db } from "@/db";
import { users, ghOrganizations } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function ReposPage() {
  // Check GitHub connection status
  const session = await getSession();
  let isGitHubDisconnected = false;

  if (session) {
    const user = await db
      .select({ defaultGhOrganizationId: users.defaultGhOrganizationId })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (user[0]?.defaultGhOrganizationId) {
      const org = await db
        .select({ githubAppConnectionStatus: ghOrganizations.githubAppConnectionStatus })
        .from(ghOrganizations)
        .where(eq(ghOrganizations.id, user[0].defaultGhOrganizationId))
        .limit(1);

      isGitHubDisconnected = org[0]?.githubAppConnectionStatus === "disconnected";
    }
  }

  return (
    <>
      <InsetHeader title="Repositories" />
      <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Repositories</h1>
              <p className="text-muted-foreground">
                Manage your repositories and their agents
              </p>
            </div>
          </div>

          {isGitHubDisconnected ? (
            <GitHubDisconnectedEmptyState
              title="No Active GitHub Connection"
              description="Your repositories are still available to view, but you'll need to reconnect GitHub to sync new changes or modify agent configurations."
            />
          ) : (
            <ReposTableClient />
          )}
        </div>
      </div>
    </>
  );
}
