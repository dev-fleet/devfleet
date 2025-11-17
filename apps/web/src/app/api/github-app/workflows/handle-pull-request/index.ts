import type { components } from "@octokit/openapi-webhooks-types";
import { ensurePullRequestStored, createPendingCheckRun, updateCheckRun, runAgent } from "./steps";

export type PullRequestOpenedOrSynchronizePayload =
  | components["schemas"]["webhook-pull-request-opened"]
  | components["schemas"]["webhook-pull-request-synchronize"];

export async function handlePullRequest(
  payload: PullRequestOpenedOrSynchronizePayload
) {
  "use workflow";

  const installationId = payload.installation!.id;
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const headSha = payload.pull_request.head.sha;
  const repoId = payload.repository.id;

  // Step 0: Ensure the pull request is stored in the database
  const pullRequestId = await ensurePullRequestStored(payload);

  // Step 1: Create a pending check run and resolve agents for this PR
  const { checkRun, agents } = await createPendingCheckRun(
    installationId,
    owner,
    repo,
    headSha,
    repoId
  );

  // Run all agents concurrently
  await Promise.all(
    agents.map(({ repoId, repoAgentId, agentId }) =>
      runAgent(installationId, repoId, repoAgentId, agentId)
    )
  );

  // Step 2: Update the check run
  await updateCheckRun(installationId, owner, repo, "success", checkRun.id, {
    title: "DevFleet",
    summary: "DevFleet completed successfully",
  });
}