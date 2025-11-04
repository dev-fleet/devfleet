import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { toast } from "sonner";
import { getSession } from "./auth";

export const client = createAuthClient({
  plugins: [inferAdditionalFields<typeof getSession>()],
  fetchOptions: {
    onError(e) {
      if (e.error.status === 429) {
        toast.error("Too many requests. Please try again later.");
      }
    },
  },
});

export const { signUp, signIn, signOut, useSession } = client;

client.$store.listen("$sessionSignal", async () => {});
