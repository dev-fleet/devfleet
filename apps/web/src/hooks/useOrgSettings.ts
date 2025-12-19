import useSWR from "swr";
import type { GetOrganizationSettingsResponse } from "@/app/api/organizations/settings/route";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useOrgSettings() {
  return useSWR<GetOrganizationSettingsResponse>(
    "/api/organizations/settings",
    fetcher
  );
}
