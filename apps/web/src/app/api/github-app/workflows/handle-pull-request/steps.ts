import { env } from "@/env.mjs";
import { App } from "octokit";
import { db } from "@/db";
import {
  agents,
  repoAgents,
  repositories,
  pullRequests,
  prCheckRuns,
  agentTemplates,
  RuleSeverity,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { Buffer } from "buffer";
import { createAgentSandbox } from "@/utils/agent/sandbox";
import { getGitHubAppInstallationAccessToken } from "@/utils/github-app/auth";
import { promptClaude, buildPrompt } from "./prompt";
import { CommandExitError } from "@e2b/code-interpreter";
import { FatalError } from "workflow";
import type { components } from "@octokit/openapi-types";
import {
  AgentStructuredOutputJsonSchema,
  AgentStructuredOutput,
  ClaudeResultSchema,
  ClaudeResult,
} from "@/utils/types";

/**
 * Parses Claude CLI stdout output and extracts the result object.
 * The stdout contains a JSON array of message objects printed on a single line,
 * and we need to find the element with type "result".
 *
 * @param stdout - The raw stdout string from Claude CLI
 * @returns The parsed ClaudeResult object
 * @throws Error if parsing fails or no result found
 */
export function parseClaudeResult(stdout: string): ClaudeResult {
  const parsed = JSON.parse(stdout.trim());

  if (!Array.isArray(parsed)) {
    throw new Error("Claude output is not an array");
  }

  const resultItem = parsed.find(
    (item) => item && typeof item === "object" && item.type === "result"
  );

  if (!resultItem) {
    throw new Error("No result item found in Claude output");
  }

  console.log("Result item:", resultItem);

  return ClaudeResultSchema.parse(resultItem);
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

export async function runAgent(
  installationId: number,
  repoId: string,
  headSha: string,
  _repoAgentId: string,
  agentId: string
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

    // Fetch the agent's prompt, falling back to the template's basePrompt if null
    const agentWithTemplate = await db
      .select({
        prompt: agents.prompt,
        basePrompt: agentTemplates.basePrompt,
      })
      .from(agents)
      .innerJoin(agentTemplates, eq(agents.agentTemplateId, agentTemplates.id))
      .where(eq(agents.id, agentId))
      .limit(1);

    const agentPrompt =
      agentWithTemplate[0]?.prompt || agentWithTemplate[0]?.basePrompt || "";

    const prompt = buildPrompt(agentPrompt);
    const jsonSchema = JSON.stringify(AgentStructuredOutputJsonSchema);

    // console.log("Prompt:", prompt);
    console.log("JSON Schema:", jsonSchema);

    const claudeResult = await sandbox.runCommand(
      `cd /devfleet && ${promptClaude(prompt, jsonSchema, "claude-sonnet-4-5-20250929")}`,
      {
        timeoutMs: 3600000, // 1 hour
        background: false,
      }
    );

    const parsedResult = parseClaudeResult(claudeResult.stdout);

    if (parsedResult.is_error) {
      throw new FatalError(`Claude execution failed: ${parsedResult.result}`);
    }

    return { parsedResult, stdout: claudeResult.stdout };
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
  stdout: string;
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
      agentStdout: r.stdout,
      runtimeMs: r.result?.duration_ms ?? 0,
      costUsd: r.result?.total_cost_usd?.toString(),
      tokensIn: r.result?.usage?.input_tokens,
      tokensOut: r.result?.usage?.output_tokens,
      rawOutput: r.result as Record<string, unknown> | null,
    };
  });

  await db.insert(prCheckRuns).values(records);
}

function isAgentStructuredOutput(
  value: unknown
): value is AgentStructuredOutput {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return Array.isArray(obj.findings);
}

function getSeverityEmoji(severity: RuleSeverity): string {
  switch (severity) {
    case "CRITICAL":
      return "🚨";
    case "HIGH":
      return "🔴";
    case "MEDIUM":
      return "🟡";
    case "LOW":
      return "🔵";
  }
}

function formatInlineComment(
  finding: AgentStructuredOutput["findings"][number]
): string {
  const emoji = getSeverityEmoji(finding.severity);
  const confidence = Math.round(finding.confidence * 100);

  return `${emoji} **${finding.severity}** · ${confidence}% confidence

**Issue:** ${finding.description}

**Suggested Fix:** ${finding.recommendation}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

interface RunStats {
  agentsRun: number;
  agentsSucceeded: number;
  agentsFailed: number;
  totalDurationMs: number;
  totalCostUsd: number;
  filesReviewed: number;
}

function extractRunStats(agentResults: AgentRunResult[]): RunStats {
  let agentsSucceeded = 0;
  let agentsFailed = 0;
  let totalDurationMs = 0;
  let totalCostUsd = 0;
  let filesReviewed = 0;

  for (const result of agentResults) {
    if (!result.result || result.result.is_error || result.error) {
      agentsFailed++;
    } else {
      agentsSucceeded++;
      totalDurationMs += result.result.duration_ms ?? 0;
      totalCostUsd += result.result.total_cost_usd ?? 0;

      const structured = result.result.structured_output;
      if (isAgentStructuredOutput(structured)) {
        filesReviewed += structured.analysis_summary?.files_reviewed ?? 0;
      }
    }
  }

  return {
    agentsRun: agentResults.length,
    agentsSucceeded,
    agentsFailed,
    totalDurationMs,
    totalCostUsd,
    filesReviewed,
  };
}

function buildSummaryComment(
  stats: RunStats,
  findings: AgentStructuredOutput["findings"]
): string {
  const criticalCount = findings.filter(
    (f) => f.severity === "CRITICAL"
  ).length;
  const highCount = findings.filter((f) => f.severity === "HIGH").length;
  const mediumCount = findings.filter((f) => f.severity === "MEDIUM").length;
  const lowCount = findings.filter((f) => f.severity === "LOW").length;

  const hasIssues = findings.length > 0;
  const hasCriticalOrHigh = criticalCount > 0 || highCount > 0;

  // Header with status
  let summary = `## 🚢 DevFleet Review\n\n`;

  // Run stats table
  summary += `| Metric | Value |\n|:--|--:|\n`;
  summary += `| Agents | ${stats.agentsSucceeded}/${stats.agentsRun} passed |\n`;
  summary += `| Files reviewed | ${stats.filesReviewed} |\n`;
  summary += `| Duration | ${formatDuration(stats.totalDurationMs)} |\n`;

  // Issues breakdown
  if (hasIssues) {
    summary += `### Issues Found\n\n`;
    summary += `| Severity | Count |\n|:--|--:|\n`;
    if (criticalCount > 0) summary += `| 🚨 Critical | ${criticalCount} |\n`;
    if (highCount > 0) summary += `| 🔴 High | ${highCount} |\n`;
    if (mediumCount > 0) summary += `| 🟡 Medium | ${mediumCount} |\n`;
    if (lowCount > 0) summary += `| 🔵 Low | ${lowCount} |\n`;
    summary += `\n`;

    if (hasCriticalOrHigh) {
      summary += `⚠️ **Action required:** Please review the inline comments for critical and high severity issues.\n`;
    }

    // List medium/low issues in summary (they won't get inline comments)
    const minorFindings = findings.filter(
      (f) => f.severity === "MEDIUM" || f.severity === "LOW"
    );
    if (minorFindings.length > 0) {
      summary += `\n<details>\n<summary>📋 Medium & Low severity issues (${minorFindings.length})</summary>\n\n`;
      for (const f of minorFindings) {
        const emoji = getSeverityEmoji(f.severity);
        summary += `#### ${emoji} \`${f.file}:${f.line}\`\n`;
        summary += `${f.description}\n\n`;
        summary += `**Suggested fix:** ${f.recommendation}\n\n---\n\n`;
      }
      summary += `</details>\n`;
    }
  } else {
    summary += `✅ **No issues found.** Great job!\n`;
  }

  return summary;
}

export async function postPRReviewComments(
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number,
  headSha: string,
  agentResults: AgentRunResult[]
) {
  "use step";

  const octokit = await getOctokit(installationId);

  // Extract stats and findings from agent results
  const stats = extractRunStats(agentResults);
  const allFindings: AgentStructuredOutput["findings"] = [];

  for (const result of agentResults) {
    if (!result.result || result.result.is_error) continue;

    const structuredOutput = result.result.structured_output;
    if (!isAgentStructuredOutput(structuredOutput)) continue;

    allFindings.push(...structuredOutput.findings);
  }

  // Build summary comment
  const summaryBody = buildSummaryComment(stats, allFindings);

  // Filter to only important issues (CRITICAL and HIGH) for inline comments
  const importantFindings = allFindings.filter(
    (f) => f.severity === "CRITICAL" || f.severity === "HIGH"
  );

  // If no important findings, just post the summary comment
  if (importantFindings.length === 0) {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: summaryBody,
    });

    return { posted: true, commentCount: 0, summaryOnly: true };
  }

  // Build inline review comments for important findings only
  const comments = importantFindings.map((finding) => ({
    path: finding.file,
    line: finding.line,
    body: formatInlineComment(finding),
  }));

  // Determine review event type
  const hasCritical = importantFindings.some((f) => f.severity === "CRITICAL");
  const event = hasCritical ? "REQUEST_CHANGES" : "COMMENT";

  try {
    await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: prNumber,
      commit_id: headSha,
      body: summaryBody,
      event: event as "REQUEST_CHANGES" | "COMMENT",
      comments,
    });

    return { posted: true, commentCount: importantFindings.length };
  } catch (error) {
    // If inline comments fail (e.g., line not in diff), post summary + fallback
    console.error("Failed to create PR review with inline comments:", error);

    // Build fallback with inline issues listed
    let fallbackBody = summaryBody;
    fallbackBody += `\n---\n\n### ⚠️ Inline Comments Failed\n\n`;
    fallbackBody += `The following issues could not be posted as inline comments:\n\n`;

    for (const f of importantFindings) {
      const emoji = getSeverityEmoji(f.severity);
      fallbackBody += `#### ${emoji} \`${f.file}:${f.line}\`\n`;
      fallbackBody += `${f.description}\n\n`;
      fallbackBody += `**Suggested fix:** ${f.recommendation}\n\n---\n\n`;
    }

    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: fallbackBody,
    });

    return {
      posted: true,
      commentCount: importantFindings.length,
      fallback: true,
    };
  }
}
