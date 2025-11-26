import { env } from "@/env.mjs";
import { App } from "octokit";
import { db } from "@/db";
import {
  agents,
  repoAgents,
  repositories,
  pullRequests,
  prCheckRuns,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { Buffer } from "buffer";
import { createAgentSandbox } from "@/utils/agent/sandbox";
import { getGitHubAppInstallationAccessToken } from "@/utils/github-app/auth";
import { promptClaude } from "./prompt";
import { CommandExitError } from "@e2b/code-interpreter";
import { FatalError } from "workflow";
import type { components } from "@octokit/openapi-types";
import type Anthropic from "@anthropic-ai/sdk";

// Types for Claude CLI output parsing
// The CLI extends the SDK's Usage type with additional cache_creation details
export type ClaudeResultUsage = Anthropic.Usage & {
  cache_creation?: {
    ephemeral_1h_input_tokens: number;
    ephemeral_5m_input_tokens: number;
  };
};

// CLI-specific per-model usage breakdown
export interface ClaudeModelUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  webSearchRequests: number;
  costUSD: number;
  contextWindow: number;
}

// CLI-specific result type - this is not an SDK type, it's output from the Claude CLI
export interface ClaudeResult {
  type: "result";
  subtype: "success" | "error";
  is_error: boolean;
  duration_ms: number;
  duration_api_ms: number;
  num_turns: number;
  result: string;
  session_id: string;
  total_cost_usd: number;
  usage: ClaudeResultUsage;
  modelUsage: Record<string, ClaudeModelUsage>;
  permission_denials: string[];
  structured_output: Record<string, unknown> | null;
  uuid: string;
}

/**
 * Parses Claude CLI stdout output and extracts the result object.
 * The stdout contains a JSON array of message objects printed on a single line,
 * and we need to find the element with type "result".
 *
 * @param stdout - The raw stdout string from Claude CLI
 * @returns The parsed ClaudeResult object, or null if not found
 */
export function parseClaudeResult(stdout: string): ClaudeResult | null {
  try {
    const parsed = JSON.parse(stdout.trim());

    if (!Array.isArray(parsed)) {
      return null;
    }

    for (const item of parsed) {
      if (item && typeof item === "object" && item.type === "result") {
        return item as ClaudeResult;
      }
    }

    return null;
  } catch {
    return null;
  }
}

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
    const jsonSchema = `{"type":"object","properties":{"findings":{"type":"array","items":{"type":"object","properties":{"file":{"type":"string"},"line":{"type":"integer","minimum":1},"severity":{"type":"string","enum":["LOW","MEDIUM","HIGH","CRITICAL"]},"category":{"type":"string"},"description":{"type":"string"},"exploit_scenario":{"type":"string"},"recommendation":{"type":"string"},"confidence":{"type":"number","minimum":0,"maximum":1}},"required":["file","line","severity","category","description","exploit_scenario","recommendation","confidence"],"additionalProperties":false}},"analysis_summary":{"type":"object","properties":{"files_reviewed":{"type":"integer","minimum":0},"high_severity":{"type":"integer","minimum":0},"medium_severity":{"type":"integer","minimum":0},"low_severity":{"type":"integer","minimum":0},"review_completed":{"type":"boolean"}},"required":["files_reviewed","high_severity","medium_severity","low_severity","review_completed"],"additionalProperties":false}}}`;

    const claudeResult = await sandbox.runCommand(
      `cd /devfleet && ${promptClaude(agentPrompts, jsonSchema, "claude-sonnet-4-5-20250929")}`,
      {
        timeoutMs: 3600000, // 1 hour
        background: false,
      }
    );

    const parsedResult = parseClaudeResult(claudeResult.stdout);

    if (!parsedResult) {
      throw new FatalError("Failed to parse Claude result from stdout");
    }

    if (parsedResult.is_error) {
      throw new FatalError(`Claude execution failed: ${parsedResult.result}`);
    }

    console.log("Claude result parsed successfully");
    console.log("Cost:", parsedResult.total_cost_usd, "USD");
    console.log("Duration:", parsedResult.duration_ms, "ms");
    console.log("Structured output:", parsedResult.structured_output);

    return parsedResult;
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

export type AgentRunResult = {
  repoId: string;
  agentId: string;
  prId: string;
  result: ClaudeResult | null;
  error?: string;
};

export async function saveAgentResults(results: AgentRunResult[]) {
  "use step";

  const records = results.map((r) => {
    const isSuccess = r.result && !r.result.is_error;
    return {
      repoId: r.repoId,
      prId: r.prId,
      agentId: r.agentId,
      status: isSuccess ? ("pass" as const) : ("error" as const),
      message: r.result?.result ?? r.error ?? "Unknown error",
      runtimeMs: r.result?.duration_ms ?? 0,
      costUsd: r.result?.total_cost_usd?.toString(),
      tokensIn: r.result?.usage?.input_tokens,
      tokensOut: r.result?.usage?.output_tokens,
      cacheHit:
        (r.result?.usage?.cache_read_input_tokens ?? 0) > 0 ? true : false,
      rawOutput: r.result as Record<string, unknown> | null,
      errorType: r.result?.is_error
        ? "agent_error"
        : r.error
          ? "execution_error"
          : null,
    };
  });

  await db.insert(prCheckRuns).values(records);
}
