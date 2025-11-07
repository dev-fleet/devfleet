import useSWR from "swr";
import { fetcher } from "@/utils/utils";
import { processSWRResponse } from "@/utils/swr";
import type { GetOrganizationAgentsResponse } from "@/app/api/agents/route";
import type { GetAgentDetailResponse } from "@/app/api/agents/[agentId]/route";

export function useAgents() {
  const swrResult = useSWR<GetOrganizationAgentsResponse | { error: string }>(
    "/api/agents",
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  );
  return processSWRResponse<GetOrganizationAgentsResponse>(swrResult);
}

export function useAgentDetail(agentId: string | null) {
  const swrResult = useSWR<GetAgentDetailResponse | { error: string }>(
    agentId ? `/api/agents/${agentId}` : null,
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  );
  return processSWRResponse<GetAgentDetailResponse>(swrResult);
}
