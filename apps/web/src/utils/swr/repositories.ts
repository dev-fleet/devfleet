import useSWR from "swr";
import { fetcher } from "@/utils/utils";
import { processSWRResponse } from "@/utils/swr";
import type { RepositoryResponse } from "@/app/api/repositories/route";

export type { RepositoryResponse } from "@/app/api/repositories/route";

type UseRepositoriesOptions = {
  page?: number;
  limit?: number;
  search?: string;
};

export function useRepositories(options: UseRepositoriesOptions = {}) {
  const { page = 1, limit = 25, search } = options;

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (search) {
    params.set("search", search);
  }

  const swrResult = useSWR<RepositoryResponse | { error: string }>(
    `/api/repositories?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      keepPreviousData: true,
    }
  );

  return processSWRResponse<RepositoryResponse>(swrResult);
}
