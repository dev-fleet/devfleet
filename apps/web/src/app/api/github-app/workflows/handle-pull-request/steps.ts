import { env } from "@/env.mjs";
import { App, Octokit } from "octokit";
import { db } from "@/db";
import { agents, repoAgents, repositories } from "@/db/schema";
import { and, eq } from "drizzle-orm";

import { Buffer } from "buffer";

const app = new App({
  appId: env.GITHUB_APP_ID,
  privateKey: Buffer.from(env.GITHUB_APP_PRIVATE_KEY, "base64").toString(
    "utf8"
  ),
});

async function getOctokit(installationId: number) {
  return await app.getInstallationOctokit(installationId);
}

async function getAgentsForRepositoryByGithubId(repoGithubId: number) {
  const repoRecord = await db
    .select({ id: repositories.id })
    .from(repositories)
    .where(eq(repositories.githubId, String(repoGithubId)))
    .limit(1);

  const repoId = repoRecord[0]?.id;
  if (!repoId) return [];

  const rows = await db
    .select({
      repoId: repoAgents.repoId,
      repoAgentId: repoAgents.id,
      agentId: agents.id,
    })
    .from(repoAgents)
    .innerJoin(agents, eq(repoAgents.agentId, agents.id))
    .where(and(eq(repoAgents.repoId, repoId), eq(repoAgents.enabled, true)))
    .orderBy(repoAgents.order);

  return rows;
}

export async function createPendingCheckRun(
  installationId: number,
  owner: string,
  repo: string,
  headSha: string,
  repoGithubId: number
) {
  "use step";
  const octokit = await getOctokit(installationId);
  const response = await octokit.rest.checks.create({
    owner,
    repo,
    head_sha: headSha,
    name: "DevFleet",
    status: "in_progress",
  });
  const repoAgentsToRun = await getAgentsForRepositoryByGithubId(repoGithubId);
  return { checkRun: response.data, agents: repoAgentsToRun } as const;
}

export async function updateCheckRun(
  installationId: number,
  owner: string,
  repo: string,
  conclusion:
    | "action_required"
    | "success"
    | "failure"
    | "neutral"
    | "cancelled"
    | "skipped"
    | "timed_out"
    | "stale",
  checkRunId: number,
  output: {
    title: string;
    summary: string;
    text?: string;
  }
) {
  "use step";
  const octokit = await getOctokit(installationId);
  const response = await octokit.rest.checks.update({
    owner,
    repo,
    check_run_id: checkRunId,
    name: "DevFleet",
    conclusion,
    output,
  });
  return response.data;
}

export async function runAgent(installationId: number, repoId: string, repoAgentId: string, agentId: string) {
  "use step";
  // TODO: Implement actual agent execution. For now, this is a no-op placeholder
  // that can be awaited concurrently.
}

