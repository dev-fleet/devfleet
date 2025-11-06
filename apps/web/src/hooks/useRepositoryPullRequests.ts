"use client";

import useSWR from "swr";
import type { GetRepositoryPullRequestsResponse } from "@/app/api/repositories/[repoId]/pull-requests/route";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useRepositoryPullRequests(repoId: string) {
  return useSWR<GetRepositoryPullRequestsResponse>(
    repoId ? `/api/repositories/${repoId}/pull-requests` : null,
    fetcher
  );
}
