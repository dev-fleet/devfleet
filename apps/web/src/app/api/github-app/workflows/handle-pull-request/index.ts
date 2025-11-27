import type { components } from "@octokit/openapi-webhooks-types";
import {
  createPendingCheckRun,
  updateCheckRun,
  runAgent,
  saveAgentResults,
  type AgentRunResult,
} from "./steps";

export type PullRequestOpenedOrSynchronizePayload =
  | components["schemas"]["webhook-pull-request-opened"]
  | components["schemas"]["webhook-pull-request-synchronize"];

export async function handlePullRequest(
  payload: PullRequestOpenedOrSynchronizePayload,
  pullRequestId: string
) {
  "use workflow";

  const installationId = payload.installation!.id;
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const headSha = payload.pull_request.head.sha;
  const repoGithubId = payload.repository.id;

  // Step: Create a pending check run and resolve agents for this PR
  const { checkRun, agents } = await createPendingCheckRun(
    installationId,
    owner,
    repo,
    headSha,
    repoGithubId
  );

  // Step: Run all agents concurrently
  const settledResults = await Promise.allSettled(
    agents.map(({ repoId, repoAgentId, agentId }) =>
      runAgent(installationId, repoId, headSha, repoAgentId, agentId).then(
        (result) => ({ repoId, agentId, result })
      )
    )
  );

  // Step: Save the agent run outputs to the database
  if (agents.length > 0) {
    // Map settled results to AgentRunResult format
    const agentResults: AgentRunResult[] = settledResults.map(
      (settled, index) => {
        const agent = agents[index]!;
        if (settled.status === "fulfilled") {
          return {
            repoId: settled.value.repoId,
            agentId: settled.value.agentId,
            prId: pullRequestId,
            result: settled.value.result.parsedResult,
            stdout: settled.value.result.stdout,
          };
        } else {
          return {
            repoId: agent.repoId,
            agentId: agent.agentId,
            prId: pullRequestId,
            result: null,
            stdout: "",
            error:
              settled.reason instanceof Error
                ? settled.reason.message
                : String(settled.reason),
          };
        }
      }
    );

    await saveAgentResults(agentResults);
  }

  // Step: Update the check run
  await updateCheckRun(installationId, owner, repo, "success", checkRun.id, {
    title: "DevFleet",
    summary: "DevFleet completed successfully",
  });
}
