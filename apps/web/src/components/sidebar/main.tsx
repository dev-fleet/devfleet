"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { type ComponentType } from "react";

// Type that accepts both LucideIcon and SVG components (like Discord)
type IconType =
  | LucideIcon
  | ComponentType<{ className?: string; fill?: string }>;

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@workspace/ui/components/sidebar";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";

export const NavMain = ({
  groups,
}: {
  groups: {
    items: {
      id?: string;
      title: string;
      url: string;
      icon: IconType;
      iconProps?: { className?: string; fill?: string; [key: string]: unknown };
      isEmphasized?: boolean;
      isExternal?: boolean;
      isActive?: boolean;
      isButton?: boolean;
      items?: {
        title: string;
        url: string;
      }[];
    }[];
    title: string;
  }[];
}) => {
  const pathname = usePathname();

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.title}>
          <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map((item) => (
              <Collapsible key={item.title} asChild defaultOpen={item.isActive}>
                <SidebarMenuItem>
                  {item.isButton ? (
                    <SidebarMenuButton
                      tooltip={item.title}
                      className={cn(
                        item.isEmphasized && "border border-dashed"
                      )}
                      id={item.id}
                    >
                      <item.icon {...(item.iconProps || {})} />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={pathname.startsWith(item.url)}
                      className={cn(
                        item.isEmphasized && "border border-dashed"
                      )}
                    >
                      <a
                        href={item.url}
                        target={item.isExternal ? "_blank" : "_self"}
                        rel={item.isExternal ? "noreferrer" : undefined}
                        id={item.id}
                      >
                        <item.icon {...(item.iconProps || {})} />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  )}
                  {item.items?.length ? (
                    <>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuAction className="data-[state=open]:rotate-90">
                          <ChevronRight />
                          <span className="sr-only">Toggle</span>
                        </SidebarMenuAction>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild>
                                <a href={subItem.url}>
                                  <span>{subItem.title}</span>
                                </a>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </>
                  ) : null}
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
};
