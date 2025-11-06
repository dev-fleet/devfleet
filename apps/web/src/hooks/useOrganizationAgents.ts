"use client";

import useSWR from "swr";
import type { GetOrganizationAgentsResponse } from "@/app/api/agents/route";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useOrganizationAgents() {
  return useSWR<GetOrganizationAgentsResponse>(`/api/agents`, fetcher);
}
