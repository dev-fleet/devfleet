"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { env } from "@/env.mjs";

interface GitHubDisconnectedEmptyStateProps {
  title?: string;
  description?: string;
  showReconnectButton?: boolean;
}

export function GitHubDisconnectedEmptyState({
  title = "GitHub Disconnected",
  description = "The GitHub App has been disconnected from your organization. Reconnect to sync repositories and enable agents.",
  showReconnectButton = true,
}: GitHubDisconnectedEmptyStateProps) {
  const handleReconnect = () => {
    window.open(env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL, "_blank");
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mb-4">
          <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {showReconnectButton && (
        <CardFooter className="flex justify-center">
          <Button onClick={handleReconnect} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Reconnect GitHub
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
