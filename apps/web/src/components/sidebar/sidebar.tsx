"use client";

import * as React from "react";
import {
  Settings,
  BookText,
  LifeBuoy,
  Send,
  Home,
  Container,
  GitBranch,
  BotIcon,
  Building2,
} from "lucide-react";
import { Discord } from "@workspace/ui/icons/discord";
import { NavMain } from "@/components/sidebar/main";
import { NavSecondary } from "@/components/sidebar/secondary";
import { NavUser } from "@/components/sidebar/user";
import { OrganizationSwitcher } from "@/components/organization-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@workspace/ui/components/sidebar";
// import { SidebarOnboarding } from "@/components/app-sidebar-onboarding";

export const AppSidebar = ({
  ...props
}: React.ComponentProps<typeof Sidebar>) => {
  const data = {
    navMain: [
      {
        title: "Home",
        items: [
          {
            title: "Home",
            url: `/dashboard`,
            icon: Home,
            isActive: true,
          },
          {
            title: "Repositories",
            url: `/repositories`,
            icon: GitBranch,
          },
          {
            title: "Agents",
            url: `/agents`,
            icon: BotIcon,
          },
        ],
      },
      {
        title: "Organization",
        items: [
          {
            title: "Settings",
            url: `/organization/settings`,
            icon: Building2,
          },
        ],
      },
      {
        title: "Support",
        items: [
          {
            title: "Feedback",
            id: "feedback-button",
            isButton: true,
            icon: Send,
            url: "#",
          },
          {
            title: "Documentation",
            url: "https://www.devfleet.ai/docs",
            icon: BookText,
            isExternal: true,
          },
          {
            title: "Discord",
            url: "https://discord.gg/m9gDBkxQnQ",
            icon: Discord,
            iconProps: { fill: "inherit" },
            isExternal: true,
          },
        ],
      },
    ],
  };

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <OrganizationSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
};
