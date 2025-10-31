import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { type ComponentType } from "react";

// Type that accepts both LucideIcon and SVG components (like Discord)
type IconType =
  | LucideIcon
  | ComponentType<{ className?: string; fill?: string }>;

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string;
    id?: string;
    url: string;
    icon: IconType;
    iconProps?: { className?: string; fill?: string; [key: string]: unknown };
  }[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild size="sm">
                <a href={item.url} id={item?.id}>
                  <item.icon {...(item.iconProps || {})} />
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
