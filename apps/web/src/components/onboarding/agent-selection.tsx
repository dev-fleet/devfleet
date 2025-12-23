"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import {
  Bot,
  Check,
  Loader2,
  ArrowRight,
  GitPullRequest,
  MessageSquare,
} from "lucide-react";
import { createAgentAndAdvance } from "@/actions/onboarding";
import type { AgentTemplate } from "@/db/schema";

/*
 * Workflow Animation Timing (7s cycle):
 * - Box 1 (PR):      0-2s    = 0% - 28.57%
 * - Box 2 (Agent):   2.5-4.5s = 35.71% - 64.29%
 * - Box 3 (Comments): 5-7s   = 71.43% - 100%
 */

function WorkflowGraph({
  agentName,
  agentIcon,
}: {
  agentName: string;
  agentIcon: string | null;
}) {
  return (
    <div className="flex items-center justify-center gap-3 py-6">
      {/* Pull Request Box */}
      <div className="animate-workflow-box1 relative flex flex-col items-center gap-2 rounded-lg border bg-card p-4 min-w-[120px]">
        <GitPullRequest className="h-6 w-6 text-muted-foreground" />
        <span className="text-sm font-medium">Pull Request</span>
      </div>

      {/* Arrow 1 */}
      <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />

      {/* Agent Box */}
      <div className="animate-workflow-box2 relative flex flex-col items-center gap-2 rounded-lg border bg-card p-4 min-w-[120px]">
        {agentIcon ? (
          <img
            src={`/agent-icons/${agentIcon}`}
            alt={agentName}
            className="h-6 w-6"
          />
        ) : (
          <Bot className="h-6 w-6 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">{agentName}</span>
      </div>

      {/* Arrow 2 */}
      <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />

      {/* Comments Box */}
      <div className="animate-workflow-box3 relative flex flex-col items-center gap-2 rounded-lg border bg-card p-4 min-w-[120px]">
        <MessageSquare className="h-6 w-6 text-muted-foreground" />
        <span className="text-sm font-medium">Comments</span>
      </div>
    </div>
  );
}

export function AgentSelection({ templates }: { templates: AgentTemplate[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selectedAgent = templates.find((t) => t.id === selectedId);

  const handleContinue = () => {
    if (!selectedId) return;

    setError(null);
    startTransition(async () => {
      const result = await createAgentAndAdvance(selectedId);
      if (result.success) {
        router.push("/onboarding/llm");
      } else {
        setError(result.error || "Failed to create agent");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="space-y-2">
        <h3 className="font-medium">Agent Templates</h3>
        <p className="text-sm text-muted-foreground">
          Agents run on your repository and react to events like pull requests.
          They can review code, analyze changes, or perform other automated tasks
          based on predefined rules. Choose a template below to get started.
        </p>
      </div>

      {/* Agent buttons - inlined */}
      <div className="flex gap-3">
        {templates.map((template) => {
          const isSelected = selectedId === template.id;
          return (
            <button
              key={template.id}
              onClick={() => setSelectedId(template.id)}
              className={cn(
                "flex-1 relative flex flex-col items-center gap-3 rounded-lg border-2 p-4 transition-all hover:border-primary/50 hover:bg-accent/50",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card"
              )}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                </div>
              )}

              {/* Icon */}
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-lg",
                  isSelected ? "bg-primary/10" : "bg-muted"
                )}
              >
                {template.icon ? (
                  <img
                    src={`/agent-icons/${template.icon}`}
                    alt={`${template.name} icon`}
                    className="h-7 w-7"
                  />
                ) : (
                  <Bot className="h-7 w-7 text-muted-foreground" />
                )}
              </div>

              {/* Name */}
              <span
                className={cn(
                  "text-sm font-medium",
                  isSelected ? "text-primary" : "text-foreground"
                )}
              >
                {template.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Expandable details section */}
      {selectedAgent && (
        <div className="rounded-xl bg-muted/50 border p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Section title */}
          <span className="text-sm font-bold text-muted-foreground">
            How it works:
          </span>

          {/* Workflow graph */}
          <WorkflowGraph
            agentName={selectedAgent.name}
            agentIcon={selectedAgent.icon}
          />

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed text-center px-4">
            {selectedAgent.description}
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Continue button */}
      <Button
        onClick={handleContinue}
        disabled={!selectedId || isPending}
        className="w-full"
        size="lg"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating agent...
          </>
        ) : (
          "Continue"
        )}
      </Button>
    </div>
  );
}
