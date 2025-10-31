"use client";

import { signIn } from "@/lib/auth-client";
import { useSearchParams } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { useEffect } from "react";
import { IconGithubLogo } from "@workspace/ui/components/github-logo";
import { toast } from "sonner";
import { env } from "@/env.mjs";

export const Social = () => {
  const searchParams = useSearchParams();
  // const callbackUrl = searchParams.get("callbackUrl");
  const error = searchParams.get("error");

  useEffect(() => {
    if (error) {
      let errorMessage = "";

      switch (error) {
        case "EmailNotFound":
          errorMessage =
            "There seems to be a problem with your email. Try with a different email.";
          break;
        default:
          errorMessage = "Unknown error occurred during sign-in";
      }

      setTimeout(() => toast.error(errorMessage));
    }
  }, [error]);

  return (
    <div className="flex w-full flex-col items-center gap-y-2">
      <Button
        size="lg"
        className="w-full"
        variant="outline"
        onClick={async () => {
          await signIn.social({
            provider: "github",
            callbackURL: `${env.NEXT_PUBLIC_URL}/dashboard`,
          });
        }}
      >
        <IconGithubLogo />
        <span>Login with Github</span>
      </Button>
    </div>
  );
};
