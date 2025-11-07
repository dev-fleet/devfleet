import { NextRequest } from "next/server";
import { env } from "@/env.mjs";
import { App } from "octokit";
import { start } from "workflow/api";
import { handlePullRequest } from "../workflows/handle-pull-request";
import type { PullRequestOpenedOrSynchronizePayload } from "../workflows/handle-pull-request";

const handler = async (request: NextRequest) => {
  const signature = request.headers.get("x-hub-signature-256");
  const name = request.headers.get("x-github-event");
  const id = request.headers.get("x-github-delivery");
  const payload = await request.text();

  if (!signature || !name || !id) {
    return new Response("Invalid signature, name, or id", { status: 400 });
  }

  const app = new App({
    appId: env.GITHUB_APP_ID,
    privateKey: Buffer.from(env.GITHUB_APP_PRIVATE_KEY, "base64").toString(
      "utf8"
    ),
    webhooks: {
      secret: env.GITHUB_APP_WEBHOOK_SECRET,
    },
  });

  // Installation Repositories events
  app.webhooks.on("installation_repositories.added", async ({ payload }) => {
    console.log("Installation repositories added:", payload);
  });
  app.webhooks.on("installation_repositories.removed", async ({ payload }) => {
    console.log("Installation repositories removed:", payload);
  });

  // Issue events
  // app.webhooks.on("issues.assigned", async ({ payload }) => {
  //   console.log("Issue assigned:", payload);
  // });
  // app.webhooks.on("issues.closed", async ({ payload }) => {
  //   console.log("Issue closed:", payload);
  // });
  // app.webhooks.on("issues.deleted", async ({ payload }) => {
  //   console.log("Issue deleted:", payload);
  // });
  // app.webhooks.on("issues.demilestoned", async ({ payload }) => {
  //   console.log("Issue demilestoned:", payload);
  // });
  // app.webhooks.on("issues.edited", async ({ payload }) => {
  //   console.log("Issue edited:", payload);
  // });
  // app.webhooks.on("issues.labeled", async ({ payload }) => {
  //   console.log("Issue labeled:", payload);
  // });
  // app.webhooks.on("issues.locked", async ({ payload }) => {
  //   console.log("Issue locked:", payload);
  // });
  // app.webhooks.on("issues.milestoned", async ({ payload }) => {
  //   console.log("Issue milestoned:", payload);
  // });
  // app.webhooks.on("issues.opened", async ({ payload }) => {
  //   console.log("Issue opened:", payload);
  // });
  // app.webhooks.on("issues.pinned", async ({ payload }) => {
  //   console.log("Issue pinned:", payload);
  // });
  // app.webhooks.on("issues.reopened", async ({ payload }) => {
  //   console.log("Issue reopened:", payload);
  // });
  // app.webhooks.on("issues.transferred", async ({ payload }) => {
  //   console.log("Issue transferred:", payload);
  // });
  // app.webhooks.on("issues.typed", async ({ payload }) => {
  //   console.log("Issue typed:", payload);
  // });
  // app.webhooks.on("issues.unassigned", async ({ payload }) => {
  //   console.log("Issue unassigned:", payload);
  // });
  // app.webhooks.on("issues.unlabeled", async ({ payload }) => {
  //   console.log("Issue unlabeled:", payload);
  // });
  // app.webhooks.on("issues.unlocked", async ({ payload }) => {
  //   console.log("Issue unlocked:", payload);
  // });
  // app.webhooks.on("issues.unpinned", async ({ payload }) => {
  //   console.log("Issue unpinned:", payload);
  // });
  // app.webhooks.on("issues.untyped", async ({ payload }) => {
  //   console.log("Issue untyped:", payload);
  // });

  // Pull Request events
  // app.webhooks.on("pull_request.assigned", async ({ payload }) => {
  //   console.log("Pull request assigned:", payload);
  // });
  // app.webhooks.on("pull_request.auto_merge_disabled", async ({ payload }) => {
  //   console.log("Pull request auto merge disabled:", payload);
  // });
  // app.webhooks.on("pull_request.auto_merge_enabled", async ({ payload }) => {
  //   console.log("Pull request auto merge enabled:", payload);
  // });
  // app.webhooks.on("pull_request.closed", async ({ payload }) => {
  //   console.log("Pull request closed:", payload);
  // });
  // app.webhooks.on("pull_request.converted_to_draft", async ({ payload }) => {
  //   console.log("Pull request converted to draft:", payload);
  // });
  // app.webhooks.on("pull_request.demilestoned", async ({ payload }) => {
  //   console.log("Pull request demilestoned:", payload);
  // });
  // app.webhooks.on("pull_request.dequeued", async ({ payload }) => {
  //   console.log("Pull request dequeued:", payload);
  // });
  // app.webhooks.on("pull_request.edited", async ({ payload }) => {
  //   console.log("Pull request edited:", payload);
  // });
  // app.webhooks.on("pull_request.enqueued", async ({ payload }) => {
  //   console.log("Pull request enqueued:", payload);
  // });
  // app.webhooks.on("pull_request.labeled", async ({ payload }) => {
  //   console.log("Pull request labeled:", payload);
  // });
  // app.webhooks.on("pull_request.locked", async ({ payload }) => {
  //   console.log("Pull request locked:", payload);
  // });
  // app.webhooks.on("pull_request.milestoned", async ({ payload }) => {
  //   console.log("Pull request milestoned:", payload);
  // });
  // app.webhooks.on("pull_request.ready_for_review", async ({ payload }) => {
  //   console.log("Pull request ready for review:", payload);
  // });
  // app.webhooks.on("pull_request.reopened", async ({ payload }) => {
  //   console.log("Pull request reopened:", payload);
  // });
  // app.webhooks.on(
  //   "pull_request.review_request_removed",
  //   async ({ payload }) => {
  //     console.log("Pull request review request removed:", payload);
  //   }
  // );
  // app.webhooks.on("pull_request.review_requested", async ({ payload }) => {
  //   console.log("Pull request review requested:", payload);
  // });
  // app.webhooks.on("pull_request.unassigned", async ({ payload }) => {
  //   console.log("Pull request unassigned:", payload);
  // });
  // app.webhooks.on("pull_request.unlabeled", async ({ payload }) => {
  //   console.log("Pull request unlabeled:", payload);
  // });
  // app.webhooks.on("pull_request.unlocked", async ({ payload }) => {
  //   console.log("Pull request unlocked:", payload);
  // });

  app.webhooks.on(
    ["pull_request.opened", "pull_request.synchronize"],
    async ({ payload }) => {
      console.log("Pull request opened:", payload);
      await start(handlePullRequest, [
        payload as PullRequestOpenedOrSynchronizePayload,
      ]);
    }
  );

  // Repository events
  // app.webhooks.on("repository.archived", async ({ payload }) => {
  //   console.log("Repository archived:", payload);
  // });
  // app.webhooks.on("repository.created", async ({ payload }) => {
  //   console.log("Repository created:", payload);
  // });
  // app.webhooks.on("repository.deleted", async ({ payload }) => {
  //   console.log("Repository deleted:", payload);
  // });
  // app.webhooks.on("repository.edited", async ({ payload }) => {
  //   console.log("Repository edited:", payload);
  // });
  // app.webhooks.on("repository.privatized", async ({ payload }) => {
  //   console.log("Repository privatized:", payload);
  // });
  // app.webhooks.on("repository.publicized", async ({ payload }) => {
  //   console.log("Repository publicized:", payload);
  // });
  // app.webhooks.on("repository.renamed", async ({ payload }) => {
  //   console.log("Repository renamed:", payload);
  // });
  // app.webhooks.on("repository.transferred", async ({ payload }) => {
  //   console.log("Repository transferred:", payload);
  // });
  // app.webhooks.on("repository.unarchived", async ({ payload }) => {
  //   console.log("Repository unarchived:", payload);
  // });

  await app.webhooks.verifyAndReceive({
    id,
    name,
    signature,
    payload,
  });

  return new Response("ok");
};

export { handler as GET, handler as POST };
