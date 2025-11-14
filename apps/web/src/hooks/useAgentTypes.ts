import useSWR from "swr";
import type { GetAgentTemplatesResponse } from "@/app/api/agent-types/route";

export function useAgentTypes() {
  return useSWR<GetAgentTemplatesResponse>("/api/agent-types");
}
