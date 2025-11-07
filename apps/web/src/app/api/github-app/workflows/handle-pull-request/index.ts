import type { components } from "@octokit/openapi-webhooks-types";
import { createPendingCheckRun, updateCheckRun } from "./steps";

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

  // Step 1: Create a pending check run
  const checkRun = await createPendingCheckRun(installationId, owner, repo, headSha);

  // Step 2: Update the check run
  await updateCheckRun(installationId, owner, repo, "success", checkRun.id, {
    title: "DevFleet",
    summary: "DevFleet completed successfully",
  });
}