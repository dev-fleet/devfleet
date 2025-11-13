import useSWR from "swr";
import type { GetAgentTypesResponse } from "@/app/api/agent-types/route";

export function useAgentTypes() {
  return useSWR<GetAgentTypesResponse>("/api/agent-types");
}

