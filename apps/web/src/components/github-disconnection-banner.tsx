"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { useUser } from "@/hooks/useUser";
import { env } from "@/env.mjs";

export function GitHubDisconnectionBanner() {
  const { data: user } = useUser();

  const activeOrg = user?.organizations?.find(
    (o) => o.id === user?.defaultGhOrganizationId
  );

  const isDisconnected = activeOrg?.githubAppConnectionStatus === "disconnected";

  // Don't show banner if not disconnected
  if (!isDisconnected) return null;

  const handleReconnect = () => {
    // Open GitHub App installation page
    window.open(env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL, "_blank");
  };

  const reasonText =
    {
      deleted: "The GitHub App has been uninstalled from your organization.",
      suspended: "The GitHub App installation has been suspended.",
      permission_revoked: "GitHub permissions have been revoked.",
    }[activeOrg?.githubAppDisconnectedReason || "deleted"] ||
    "GitHub connection has been lost.";

  return (
    <div className="border-b bg-orange-50 dark:bg-orange-950/20">
      <div className="container mx-auto px-4 py-3">
        <Alert variant="destructive" className="border-none bg-transparent p-0">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 mt-0.5 text-orange-600 dark:text-orange-400" />
            <div className="flex-1 space-y-2">
              <AlertTitle className="text-base font-semibold">
                GitHub Disconnected
              </AlertTitle>
              <AlertDescription className="text-sm">
                {reasonText} Your agents have been automatically disabled, but
                all historical data (repositories, PRs, check runs) has been
                preserved. Reconnect GitHub to resume agent operations.
              </AlertDescription>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleReconnect}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Reconnect GitHub
                </Button>
              </div>
            </div>
          </div>
        </Alert>
      </div>
    </div>
  );
}
