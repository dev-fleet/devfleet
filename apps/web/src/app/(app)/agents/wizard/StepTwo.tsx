"use client";

import { useState, useMemo, useEffect } from "react";
import { useAgentTemplates } from "@/hooks/useAgentTemplates";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { Loader2 } from "lucide-react";

interface StepTwoProps {
  agentTemplateId: string;
  onComplete: (prompt: string) => void;
  onBack: () => void;
}

export function StepTwo({ agentTemplateId, onComplete, onBack }: StepTwoProps) {
  const { data, isLoading } = useAgentTemplates();
  const [prompt, setPrompt] = useState("");

  const template = useMemo(() => {
    return data?.agentTemplates?.find((t) => t.id === agentTemplateId);
  }, [data, agentTemplateId]);

  // Initialize prompt with template's basePrompt
  useEffect(() => {
    if (template?.basePrompt) {
      setPrompt(template.basePrompt);
    }
  }, [template]);

  const handleContinue = () => {
    onComplete(prompt);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
        <p className="text-sm text-destructive">Template not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Edit Prompt</h2>
        <p className="text-muted-foreground">
          Customize the prompt for {template.name}. This defines what the agent
          will look for when reviewing pull requests.
        </p>
      </div>

      {/* Prompt Editor */}
      <div className="space-y-2">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter the agent prompt..."
          className="min-h-[400px] font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          The prompt will be used to guide the agent&apos;s code review
          analysis.
        </p>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between border-t pt-6">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleContinue} disabled={!prompt.trim()}>
          Continue to Repositories
        </Button>
      </div>
    </div>
  );
}
