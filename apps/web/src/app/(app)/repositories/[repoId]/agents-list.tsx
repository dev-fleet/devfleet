"use client";

import { useState } from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Switch } from "@workspace/ui/components/switch";
import { Button } from "@workspace/ui/components/button";
import { GripVertical, Trash2 } from "lucide-react";
import {
  toggleAgentEnabled,
  removeAgentFromRepository,
  reorderAgents,
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
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";

type Agent = {
  repoAgentId: string;
  agentId: string;
  agentName: string;
  agentDescription: string | null;
  agentEngine: "anthropic" | "openai";
  enabled: boolean;
  order: number;
};

export function AgentsList({
  repoId,
  agents: initialAgents,
}: {
  repoId: string;
  agents: Agent[];
}) {
  const router = useRouter();
  const [agents, setAgents] = useState(initialAgents);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

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

  const handleDragStart = (index: number) => {
    setDraggingIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggingIndex === null || draggingIndex === index) return;

    const newAgents = [...agents];
    const draggedAgent = newAgents[draggingIndex];
    newAgents.splice(draggingIndex, 1);
    newAgents.splice(index, 0, draggedAgent);

    setAgents(newAgents);
    setDraggingIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggingIndex === null) return;

    // Update the order values based on new positions
    const agentOrders = agents.map((agent, index) => ({
      repoAgentId: agent.repoAgentId,
      order: index,
    }));

    try {
      await reorderAgents(repoId, agentOrders);
      toast.success("Agent order updated");
    } catch (error) {
      toast.error("Failed to update agent order");
      console.error(error);
      // Revert on error
      router.refresh();
    }

    setDraggingIndex(null);
  };

  return (
    <div className="space-y-2">
      {agents.map((agent, index) => (
        <div
          key={agent.repoAgentId}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
          className={`flex items-center gap-3 p-4 border rounded-lg bg-card transition-colors ${
            draggingIndex === index
              ? "opacity-50 border-primary"
              : "hover:bg-muted/50"
          }`}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab active:cursor-grabbing" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{agent.agentName}</span>
              <Badge variant="outline" className="text-xs">
                {agent.agentEngine}
              </Badge>
            </div>
            {agent.agentDescription && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                {agent.agentDescription}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {agent.enabled ? "Enabled" : "Disabled"}
              </span>
              <Switch
                checked={agent.enabled}
                onCheckedChange={() => handleToggleEnabled(agent.repoAgentId)}
              />
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Agent</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove {agent.agentName} from this
                    repository? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      handleRemoveAgent(agent.repoAgentId, agent.agentName)
                    }
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ))}
    </div>
  );
}
