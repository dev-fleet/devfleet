"use client";

import { useState } from "react";
import { Switch } from "@workspace/ui/components/switch";
import {
  addAgentToRepository,
  removeAgentFromRepository,
} from "@/actions/repositories";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from "@workspace/ui/components/item";
import type { GetRepositoryAgentsResponse } from "@/app/api/repositories/[repoId]/agents/route";

type OrgAgent = {
  id: string;
  name: string;
  description: string | null;
  engine: "anthropic" | "openai";
};

type RepoAgent = GetRepositoryAgentsResponse[number];

type AgentState = {
  isAdded: boolean;
  repoAgentId: string | null;
};

export function AgentsToggleList({
  repoId,
  orgAgents,
  repoAgents: initialRepoAgents,
}: {
  repoId: string;
  orgAgents: OrgAgent[];
  repoAgents: RepoAgent[];
}) {
  const router = useRouter();
  const [agentStates, setAgentStates] = useState<Record<string, AgentState>>(
    () => {
      const states: Record<string, AgentState> = {};
      for (const agent of orgAgents) {
        const repoAgent = initialRepoAgents.find(
          (ra) => ra.agentId === agent.id
        );
        states[agent.id] = {
          isAdded: !!repoAgent,
          repoAgentId: repoAgent?.repoAgentId ?? null,
        };
      }
      return states;
    }
  );
  const [loadingAgents, setLoadingAgents] = useState<Set<string>>(new Set());

  const handleToggle = async (agent: OrgAgent) => {
    const currentState = agentStates[agent.id];
    if (!currentState) return;

    setLoadingAgents((prev) => new Set(prev).add(agent.id));

    try {
      if (currentState.isAdded && currentState.repoAgentId) {
        await removeAgentFromRepository(currentState.repoAgentId);
        setAgentStates((prev) => ({
          ...prev,
          [agent.id]: { isAdded: false, repoAgentId: null },
        }));
        toast.success(`Removed ${agent.name} from repository`);
      } else {
        const result = await addAgentToRepository(repoId, agent.id);
        setAgentStates((prev) => ({
          ...prev,
          [agent.id]: {
            isAdded: true,
            repoAgentId: result.repoAgentId,
          },
        }));
        toast.success(`Added ${agent.name} to repository`);
      }
      router.refresh();
    } catch (error) {
      toast.error(
        currentState.isAdded
          ? "Failed to remove agent"
          : "Failed to add agent"
      );
      console.error(error);
    } finally {
      setLoadingAgents((prev) => {
        const next = new Set(prev);
        next.delete(agent.id);
        return next;
      });
    }
  };

  if (orgAgents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No agents available in your organization
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {orgAgents.map((agent) => {
        const state = agentStates[agent.id];
        const isLoading = loadingAgents.has(agent.id);

        return (
          <Item key={agent.id} variant="outline">
            <ItemContent>
              <ItemTitle>{agent.name}</ItemTitle>
              {agent.description && (
                <ItemDescription>{agent.description}</ItemDescription>
              )}
            </ItemContent>
            <ItemActions>
              <span className="text-sm text-muted-foreground mr-2">
                {state?.isAdded ? "Enabled" : "Disabled"}
              </span>
              <Switch
                checked={state?.isAdded ?? false}
                onCheckedChange={() => handleToggle(agent)}
                disabled={isLoading}
              />
            </ItemActions>
          </Item>
        );
      })}
    </div>
  );
}
