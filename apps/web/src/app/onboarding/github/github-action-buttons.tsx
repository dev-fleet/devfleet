"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { ChevronDown, Plus, RefreshCw } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { setActiveOrganization, syncOrganizations } from "@/actions/organization";
import { toast } from "sonner";
import { env } from "@/env.mjs";
import { Avatar, AvatarImage } from "@workspace/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

const DICEBEAR_AVATAR_URL = "https://api.dicebear.com/9.x/initials/svg?seed=";

export function GitHubActionButtons() {
  const { data: user, isLoading: isUserLoading, mutate } = useUser();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isLoading = isUserLoading;
  const userOrganizations = user?.organizations;
  const activeOrganization =
    userOrganizations?.find((o) => o.id === user?.defaultGhOrganizationId) ||
    (!user?.defaultGhOrganizationId && userOrganizations
      ? userOrganizations.find((o) => o.organizationType === "USER")
      : undefined);

  const handleOrganizationSwitch = async (orgId: string) => {
    const org = user?.organizations?.find((o) => o.id === orgId);
    if (!org) return;

    try {
      const result = await setActiveOrganization(orgId);
      if (result.success) {
        // Revalidate the user data to get the updated active organization
        mutate();
      } else {
        toast.error(result.message || "Failed to switch organization");
      }
    } catch (error) {
      console.error("Error switching organization:", error);
      toast.error("Failed to switch organization");
    }
  };

  const handleRefreshOrganizations = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      const result = await syncOrganizations();

      if (!result.success) {
        throw new Error(result.message || "Failed to sync organizations");
      }

      await mutate();
    } catch (error) {
      console.error("Error syncing organizations:", error);
      toast.error("Failed to sync organizations");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleConnect = () => {
    const organizationId = activeOrganization?.organizationId;
    if (!organizationId) return;

    const url = `${env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL}/permissions?target_id=${organizationId}`;
    window.location.href = url;
  };

  if (isLoading) {
    return (
      <div className="flex gap-3 pt-4">
        <div className="flex-1">
          <Button variant="outline" className="w-full animate-pulse" disabled>
            <div className="h-4 w-24 bg-muted-foreground/20 rounded" />
          </Button>
        </div>
        <div className="flex-1">
          <Button className="w-full animate-pulse" disabled>
            <div className="h-4 w-16 bg-white/20 rounded" />
          </Button>
        </div>
      </div>
    );
  }

  if (userOrganizations?.length === 0 || !activeOrganization) {
    return (
      <div className="flex gap-3 pt-4">
        <div className="flex-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between"
                disabled
              >
                <span>No organization available</span>
                <ChevronDown className="size-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full min-w-56" align="start">
              <DropdownMenuItem
                onClick={() => {
                  const url = `https://github.com/settings/connections/applications/${env.NEXT_PUBLIC_AUTH_GITHUB_ID}`;
                  window.open(url, "_blank");
                }}
                className="gap-2 p-2"
              >
                <Plus className="size-4" />
                <span>Add other organization</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex-1">
          <Button disabled className="w-full">
            Connect
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 pt-4">
      {/* Organization Dropdown */}
      <div className="flex-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="size-5">
                  <AvatarImage
                    src={
                      activeOrganization.organizationType === "USER"
                        ? `${env.NEXT_PUBLIC_URL}/github-mark.svg`
                        : activeOrganization.avatarUrl ||
                          `${DICEBEAR_AVATAR_URL}${activeOrganization.login}`
                    }
                    alt={
                      activeOrganization.organizationType === "USER"
                        ? "GitHub"
                        : activeOrganization.displayName ||
                          activeOrganization.login
                    }
                  />
                </Avatar>
                <span className="truncate">
                  {activeOrganization.displayName || activeOrganization.login}
                </span>
              </div>
              <ChevronDown className="size-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-full min-w-56" align="start">
            {userOrganizations && userOrganizations.length > 1 && (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span>Organizations</span>
                      <span
                        className={`text-xs ${isRefreshing ? "text-gray-500" : "text-green-600"}`}
                      >
                        {isRefreshing ? "refreshing..." : "synced"}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0"
                      disabled={isRefreshing}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRefreshOrganizations();
                      }}
                    >
                      <RefreshCw
                        className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`}
                      />
                    </Button>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {userOrganizations.map((org) => (
                  <DropdownMenuItem
                    key={org.id}
                    onClick={() => handleOrganizationSwitch(org.id)}
                    className="gap-2 p-2"
                  >
                    <Avatar className="size-6">
                      <AvatarImage
                        src={
                          org.organizationType === "USER"
                            ? `${env.NEXT_PUBLIC_URL}/github-mark.svg`
                            : org.avatarUrl ||
                              `${DICEBEAR_AVATAR_URL}${org.login}`
                        }
                        alt={
                          org.organizationType === "USER"
                            ? "GitHub"
                            : org.displayName || org.login
                        }
                      />
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {org.displayName || org.login}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {org.organizationType === "USER"
                          ? "Personal"
                          : "Organization"}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </>
            )}
            {userOrganizations && userOrganizations.length > 1 && (
              <DropdownMenuSeparator />
            )}
            <DropdownMenuItem
              onClick={() => {
                const url = `https://github.com/settings/connections/applications/${env.NEXT_PUBLIC_AUTH_GITHUB_ID}`;
                window.open(url, "_blank");
              }}
              className="gap-2 p-2"
            >
              <Plus className="size-4" />
              <span>Add other organization</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Connect Button */}
      <div className="flex-1">
        <Button onClick={handleConnect} className="w-full">
          Connect
        </Button>
      </div>
    </div>
  );
}
