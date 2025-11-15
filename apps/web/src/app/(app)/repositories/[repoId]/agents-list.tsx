"use client";

import { useState } from "react";
import Link from "next/link";
import { Switch } from "@workspace/ui/components/switch";
import { Button } from "@workspace/ui/components/button";
import { MoreVertical, Trash2 } from "lucide-react";
import {
  toggleAgentEnabled,
  removeAgentFromRepository,
} from "@/actions/repositories";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from "@workspace/ui/components/item";
import type { GetRepositoryAgentsResponse } from "@/app/api/repositories/[repoId]/agents/route";

type Agent = GetRepositoryAgentsResponse[number];

export function AgentsList({ agents: initialAgents }: { agents: Agent[] }) {
  const router = useRouter();
  const [agents, setAgents] = useState(initialAgents);
  const [agentToRemove, setAgentToRemove] = useState<{
    repoAgentId: string;
    agentName: string;
  } | null>(null);

  const handleToggleEnabled = async (repoAgentId: string) => {
    try {
      const result = await toggleAgentEnabled(repoAgentId);
      if (result.success) {
        setAgents((prev) =>
          prev.map((agent) =>
            agent.repoAgentId === repoAgentId
              ? { ...agent, enabled: result.enabled }
              : agent
          )
        );
        toast.success(result.enabled ? "Agent enabled" : "Agent disabled");
      }
    } catch (error) {
      toast.error("Failed to update agent status");
      console.error(error);
    }
  };

  const handleRemoveAgent = async (repoAgentId: string, agentName: string) => {
    try {
      await removeAgentFromRepository(repoAgentId);
      setAgents((prev) =>
        prev.filter((agent) => agent.repoAgentId !== repoAgentId)
      );
      toast.success(`Removed ${agentName} from repository`);
      router.refresh();
    } catch (error) {
      toast.error("Failed to remove agent");
      console.error(error);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        {agents.map((agent) => (
          <Item key={agent.repoAgentId} variant="outline" asChild>
            <Link href={`/agents/${agent.agentId}`}>
              <ItemContent>
                <ItemTitle>{agent.agentName}</ItemTitle>
                {agent.agentDescription && (
                  <ItemDescription>{agent.agentDescription}</ItemDescription>
                )}
              </ItemContent>

              <ItemActions onClick={(e) => e.preventDefault()}>
                <Switch
                  checked={agent.enabled}
                  onCheckedChange={() => handleToggleEnabled(agent.repoAgentId)}
                />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() =>
                        setAgentToRemove({
                          repoAgentId: agent.repoAgentId,
                          agentName: agent.agentName,
                        })
                      }
                    >
                      <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ItemActions>
            </Link>
          </Item>
        ))}
      </div>

      <AlertDialog
        open={!!agentToRemove}
        onOpenChange={(open) => !open && setAgentToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {agentToRemove?.agentName} from
              this repository? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (agentToRemove) {
                  handleRemoveAgent(
                    agentToRemove.repoAgentId,
                    agentToRemove.agentName
                  );
                  setAgentToRemove(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
