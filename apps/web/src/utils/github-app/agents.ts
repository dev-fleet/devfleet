import { db } from "@/db";
import { agents, repoAgents, repositories } from "@/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Check if a repository has any active agents (non-workflow version)
 * This can be called outside of workflows to check before starting a workflow
 */
export async function hasActiveAgentsForRepository(
  repoGithubId: number
): Promise<boolean> {
  const repoRecord = await db
    .select({ id: repositories.id })
    .from(repositories)
    .where(eq(repositories.githubId, String(repoGithubId)))
    .limit(1);

  const repoId = repoRecord[0]?.id;
  if (!repoId) return false;

  const rows = await db
    .select({
      repoId: repoAgents.repoId,
    })
    .from(repoAgents)
    .innerJoin(agents, eq(repoAgents.agentId, agents.id))
    .where(and(eq(repoAgents.repoId, repoId), eq(repoAgents.enabled, true)))
    .limit(1);

  return rows.length > 0;
}
