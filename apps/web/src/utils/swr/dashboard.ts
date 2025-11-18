import useSWR from "swr";
import type { DashboardStatsResponse } from "@/app/api/dashboard/stats/route";
import { fetcher } from "@/utils/utils";

export function useDashboardStats() {
  return useSWR<DashboardStatsResponse>("/api/dashboard/stats", fetcher);
}
