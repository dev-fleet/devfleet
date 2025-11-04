import useSWR from "swr";
import { fetcher } from "@/utils/utils";
import { UserResponse } from "@/app/api/user/me/route";
import { processSWRResponse } from "@/utils/swr";

export function useUser() {
  const swrResult = useSWR<UserResponse | { error: string }>(
    "/api/user/me",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
  return processSWRResponse<UserResponse>(swrResult);
}
