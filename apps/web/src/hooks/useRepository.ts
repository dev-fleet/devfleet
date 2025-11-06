"use client";

import useSWR from "swr";
import type { GetRepositoryResponse } from "@/app/api/repositories/[repoId]/route";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useRepository(repoId: string) {
  return useSWR<GetRepositoryResponse>(
    repoId ? `/api/repositories/${repoId}` : null,
    fetcher
  );
}
