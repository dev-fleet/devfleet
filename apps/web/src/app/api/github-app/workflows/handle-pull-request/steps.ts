import { env } from "@/env.mjs";
import { App } from "octokit";
import { db } from "@/db";
import { agents, repoAgents, repositories } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { Buffer } from "buffer";
import { createAgentSandbox } from "@/utils/agent/sandbox";
import { getGitHubAppInstallationAccessToken } from "@/utils/github-app/auth";
import { promptClaude } from "./prompt";
import { CommandExitError } from "@e2b/code-interpreter";
import { FatalError } from "workflow";
import type { components } from "@octokit/openapi-types";

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
    .where(and(eq(repoAgents.repoId, repoId), eq(repoAgents.enabled, true)));

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

export type PullRequestFileDiff = components["schemas"]["diff-entry"];

export async function fetchPullRequestFiles(
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number
) {
  "use step";
  const octokit = await getOctokit(installationId);
  const response = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
  });
  return response.data;
}

// Improvement:
// - Get a diff using something like `git diff origin/main...HEAD`
export async function runAgent(
  installationId: number,
  repoId: string,
  headSha: string,
  _repoAgentId: string,
  _agentId: string
) {
  "use step";

  // Get the repository details
  const repo = await db
    .select({
      fullName: repositories.fullName,
    })
    .from(repositories)
    .where(eq(repositories.id, repoId))
    .limit(1);

  if (!repo[0]) {
    throw new Error("Repository not found");
  }

  const repoFullName = repo[0].fullName;

  // Get GitHub App installation token
  const githubToken = await getGitHubAppInstallationAccessToken(installationId);

  // Create the sandbox
  const sandbox = await createAgentSandbox(
    {
      templateId: "devfleet",
      apiKey: env.E2B_API_KEY,
    },
    {
      envs: {
        ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
      },
    }
  );

  try {
    // Create the devfleet directory and set the permissions
    await sandbox.runCommand(
      `sudo mkdir -p /devfleet && sudo chown $USER:$USER /devfleet`,
      {
        timeoutMs: 30000, // 30 seconds
        background: false,
      }
    );

    // Clone the repository using the installation token
    await sandbox.runCommand(
      `cd /devfleet && git clone https://x-access-token:${githubToken}@github.com/${repoFullName}.git .`,
      {
        timeoutMs: 3600000,
        background: false,
      }
    );

    // Checkout the PR branch
    await sandbox.runCommand(`cd /devfleet && git checkout ${headSha}`, {
      timeoutMs: 60000, // 1 minute
      background: false,
    });

    const agentPrompts = `TODO: Agent prompts`;

    const claudeResult = await sandbox.runCommand(
      `cd /devfleet && ${promptClaude(agentPrompts, "claude-sonnet-4-5-20250929")}`,
      {
        timeoutMs: 3600000, // 1 hour
        background: false,
        onStdout: (data) => console.log("stdout", data),
      }
    );

    console.log("Claude result");
    console.log(claudeResult.stdout);
    console.log("stderr");
    console.log(claudeResult.stderr);
    console.log("full object");
    console.log(JSON.stringify(claudeResult, null, 2));

    // Run the agent
  } catch (error) {
    if (error instanceof CommandExitError) {
      console.error("Command failed with exit code:", error.exitCode);
      console.error("Error message:", error.error);
      console.error("stdout:", error.stdout);
      console.error("stderr:", error.stderr);

      // Try to parse stdout for Claude-specific errors
      try {
        const lines = error.stdout.split("\n").filter((line) => line.trim());
        const lastLine = lines[lines.length - 1];

        if (lastLine && lastLine.startsWith("{")) {
          const parsed = JSON.parse(lastLine);

          // Handle Claude-specific errors
          if (parsed.type === "result" && parsed.is_error) {
            const errorMessage = parsed.result || "";

            switch (true) {
              case errorMessage.includes("Invalid API key"):
                throw new FatalError(
                  "Claude API authentication failed: Invalid API key. Please ensure ANTHROPIC_API_KEY is properly configured."
                );

              // Add more error conditions here
              // case errorMessage.includes("Rate limit"):
              //   throw new Error("Claude API rate limit exceeded. Please try again later.");

              default:
                throw new Error(
                  `Claude execution failed: ${errorMessage || "Unknown error"}`
                );
            }
          }
        }
      } catch (parseError) {
        // If JSON parsing fails, continue with original error
        if (parseError instanceof SyntaxError) {
          console.error("Failed to parse Claude output as JSON");
        } else {
          throw parseError; // Re-throw if it's our custom error
        }
      }
    }

    console.error("An error occurred:", error);
    throw error;
  } finally {
    await sandbox.kill();
  }
}
