import useSWR from "swr";
import { fetcher } from "@/utils/utils";
import { processSWRResponse } from "@/utils/swr";
import type { RepositoryResponse } from "@/app/api/repositories/route";

export function useRepositories() {
  const swrResult = useSWR<RepositoryResponse | { error: string }>(
    "/api/repositories",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return processSWRResponse<RepositoryResponse>(swrResult);
}
