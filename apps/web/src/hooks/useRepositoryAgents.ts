"use client";

import useSWR from "swr";
import type { GetRepositoryAgentsResponse } from "@/app/api/repositories/[repoId]/agents/route";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useRepositoryAgents(repoId: string) {
  return useSWR<GetRepositoryAgentsResponse>(
    repoId ? `/api/repositories/${repoId}/agents` : null,
    fetcher
  );
}
