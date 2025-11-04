import { GhOrganization } from "@/db/schema";
import { fetcher } from "@/utils/utils";
import useSWR from "swr";

export function useOrganizations() {
  return useSWR<GhOrganization[]>("/api/organizations", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
}
