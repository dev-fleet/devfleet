import useSWR from "swr";
import type { GetAgentTemplatesResponse } from "@/app/api/agent-templates/route";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useAgentTemplates() {
  return useSWR<GetAgentTemplatesResponse>("/api/agent-templates", fetcher);
}
