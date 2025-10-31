"use client";

import { ChevronDown } from "lucide-react";
import { useUser } from "@/lib/swr/user";
import { useOrganizations } from "@/lib/swr/organizations";
import { setActiveOrganization } from "@/actions/organization";
import { getNameInitials } from "@/lib/utils";
import { useSidebar } from "@workspace/ui/components/sidebar";
import { toast } from "sonner";
import { mutate } from "swr";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";
import { env } from "@/env.mjs";

const DICEBEAR_AVATAR_URL = "https://api.dicebear.com/9.x/initials/svg?seed=";

export function OrganizationSwitcher() {
  const { user, isLoading: isUserLoading } = useUser();
  const { data: organizations, isLoading: isOrgsLoading } = useOrganizations();
  const { isMobile } = useSidebar();

  const isLoading = isUserLoading || isOrgsLoading;
  const activeOrganization = user?.activeOrganization;

  const handleOrganizationSwitch = async (orgId: string) => {
    const org = organizations?.find((o) => o.id === orgId);
    if (!org) return;

    try {
      const result = await setActiveOrganization(orgId);
      if (result.success) {
        // Revalidate the user data to get the updated active organization
        mutate("/api/me");
        toast.success(`Switched to ${org.name || org.login}`);
      } else {
        toast.error(result.message || "Failed to switch organization");
      }
    } catch (error) {
      console.error("Error switching organization:", error);
      toast.error("Failed to switch organization");
    }
  };

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="animate-pulse">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted">
              <div className="size-4 rounded-full bg-muted-foreground/20" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <div className="h-4 w-24 bg-muted-foreground/20 rounded" />
              <div className="h-3 w-16 bg-muted-foreground/20 rounded mt-1" />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (!activeOrganization) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8">
                <AvatarImage
                  src={
                    activeOrganization.type === "User"
                      ? `${env.NEXT_PUBLIC_URL}/github-mark.svg`
                      : activeOrganization.avatarUrl ||
                        `${DICEBEAR_AVATAR_URL}${activeOrganization.login}`
                  }
                  alt={
                    activeOrganization.type === "User"
                      ? "GitHub"
                      : activeOrganization.name || activeOrganization.login
                  }
                />
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {activeOrganization.login}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  Change Organization
                </span>
              </div>
              <ChevronDown className="ml-auto size-4 opacity-50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Organizations
            </DropdownMenuLabel>
            {organizations?.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => handleOrganizationSwitch(org.id)}
                className="gap-2 p-2"
              >
                <Avatar className="size-6">
                  <AvatarImage
                    src={
                      org.type === "User"
                        ? `${env.NEXT_PUBLIC_URL}/github-mark.svg`
                        : org.avatarUrl || `${DICEBEAR_AVATAR_URL}${org.login}`
                    }
                    alt={org.type === "User" ? "GitHub" : org.name || org.login}
                  />
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-medium">{org.name || org.login}</span>
                  <span className="text-xs text-muted-foreground">
                    {org.type === "User" ? "Personal" : "Organization"}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
