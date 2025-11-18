import { db } from "@/db";
import { pullRequests, repositories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedOctokit } from "./auth";
import type { components } from "@octokit/openapi-webhooks-types";

type PullRequestPayload =
  | components["schemas"]["webhook-pull-request-opened"]
  | components["schemas"]["webhook-pull-request-synchronize"]
  | components["schemas"]["webhook-pull-request-closed"]
  | components["schemas"]["webhook-pull-request-reopened"]
  | components["schemas"]["webhook-pull-request-converted-to-draft"]
  | components["schemas"]["webhook-pull-request-ready-for-review"];

/**
 * Map GitHub PR state to database enum
 */
function mapPullRequestState(
  state: string,
  draft: boolean,
  merged: boolean
): "open" | "closed" | "merged" | "draft" {
  if (merged) return "merged";
  if (draft) return "draft";
  if (state === "closed") return "closed";
  return "open";
}

/**
 * Store or update a pull request from webhook payload
 */
export async function storePullRequestFromWebhook(
  payload: PullRequestPayload
): Promise<{ success: boolean; pullRequestId?: string; error?: string }> {
  try {
    const pr = payload.pull_request;
    const repoGithubId = payload.repository.id.toString();

    // Find repository
    const repoRecord = await db
      .select({ id: repositories.id })
      .from(repositories)
      .where(eq(repositories.githubId, repoGithubId))
      .limit(1);

    if (!repoRecord[0]) {
      return {
        success: false,
        error: `Repository with GitHub ID ${repoGithubId} not found`,
      };
    }

    const repoId = repoRecord[0].id;
    const isMerged = pr.merged || false;
    const isDraft = pr.draft || false;
    const state = mapPullRequestState(pr.state, isDraft, isMerged);

    const labels = pr.labels
      ? pr.labels.map((label) => ({
          id: label.id,
          name: label.name,
          color: label.color,
          description: label.description,
        }))
      : [];

    // Weird but assignees can be null[]. Filter out nulls.
    const assignees = pr.assignees
      ? pr.assignees.map((assignee) => assignee?.login).filter(Boolean)
      : [];

    // Similar to assignees, requested reviewers can be null[]. Filter out nulls.
    const requestedReviewers = pr.requested_reviewers
      ? pr.requested_reviewers
          .filter((reviewer) => reviewer !== null)
          .map((reviewer) => ("login" in reviewer ? reviewer.login : null))
          .filter(Boolean)
      : [];

    const prData = {
      repoId,
      prNumber: pr.number,
      title: pr.title,
      description: pr.body || null,
      authorLogin: pr.user?.login || "unknown",
      state,
      draft: isDraft,
      baseSha: pr.base.sha,
      headSha: pr.head.sha,
      htmlUrl: pr.html_url,
      labels,
      assignees,
      requestedReviewers,
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
      closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
      mergedBy: pr.merged_by?.login || null,
      updatedAt: new Date(),
    };

    const [upsertedPr] = await db
      .insert(pullRequests)
      .values(prData)
      .onConflictDoUpdate({
        target: [pullRequests.repoId, pullRequests.prNumber],
        set: prData,
      })
      .returning({ id: pullRequests.id });

    if (!upsertedPr) {
      throw new Error("Failed to upsert pull request");
    }

    return {
      success: true,
      pullRequestId: upsertedPr.id,
    };
  } catch (error) {
    console.error("Error storing pull request from webhook:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

interface ReviewData {
  approvalStatus: "approved" | "changes_requested" | "pending" | null;
  reviewCount: number;
  firstReviewAt: Date | null;
}

/**
 * Fetch review data from GitHub API for a pull request
 */
export async function fetchPullRequestReviews(
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number
): Promise<ReviewData> {
  try {
    const octokit = await getAuthenticatedOctokit(installationId);

    const { data: reviews } = await octokit.rest.pulls.listReviews({
      owner,
      repo,
      pull_number: prNumber,
    });

    if (reviews.length === 0) {
      return {
        approvalStatus: null,
        reviewCount: 0,
        firstReviewAt: null,
      };
    }

    // Find first review
    const sortedReviews = reviews
      .filter((r) => r.submitted_at)
      .sort(
        (a, b) =>
          new Date(a.submitted_at!).getTime() -
          new Date(b.submitted_at!).getTime()
      );

    const firstReviewAt = sortedReviews[0]?.submitted_at
      ? new Date(sortedReviews[0].submitted_at)
      : null;

    // Get latest review from each reviewer
    const latestReviewByUser = new Map<string, (typeof reviews)[number]>();

    for (const review of reviews) {
      if (!review.user?.login) continue;
      const existing = latestReviewByUser.get(review.user.login);
      if (
        !existing ||
        (review.submitted_at &&
          existing.submitted_at &&
          new Date(review.submitted_at) > new Date(existing.submitted_at))
      ) {
        latestReviewByUser.set(review.user.login, review);
      }
    }

    const latestReviews = Array.from(latestReviewByUser.values());
    const hasApproval = latestReviews.some((r) => r.state === "APPROVED");
    const hasChangesRequested = latestReviews.some(
      (r) => r.state === "CHANGES_REQUESTED"
    );

    let approvalStatus: "approved" | "changes_requested" | "pending";
    if (hasChangesRequested) {
      approvalStatus = "changes_requested";
    } else if (hasApproval) {
      approvalStatus = "approved";
    } else {
      approvalStatus = "pending";
    }

    return {
      approvalStatus,
      reviewCount: reviews.length,
      firstReviewAt,
    };
  } catch (error) {
    console.error("Error fetching pull request reviews:", error);
    return {
      approvalStatus: null,
      reviewCount: 0,
      firstReviewAt: null,
    };
  }
}

/**
 * Enrich a pull request with review data from GitHub API
 */
export async function enrichPullRequestWithReviewData(
  pullRequestId: string,
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const reviewData = await fetchPullRequestReviews(
      installationId,
      owner,
      repo,
      prNumber
    );

    await db
      .update(pullRequests)
      .set({
        approvalStatus: reviewData.approvalStatus,
        reviewCount: reviewData.reviewCount,
        firstReviewAt: reviewData.firstReviewAt,
        updatedAt: new Date(),
      })
      .where(eq(pullRequests.id, pullRequestId));

    return { success: true };
  } catch (error) {
    console.error("Error enriching pull request with review data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
