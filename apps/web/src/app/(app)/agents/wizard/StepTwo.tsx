"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useAgentTemplates } from "@/hooks/useAgentTemplates";
import { Button } from "@workspace/ui/components/button";
import { PromptEditor } from "@/components/prompt-editor";
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
import { Loader2 } from "lucide-react";

interface StepTwoProps {
  agentTemplateId: string;
  onComplete: (data: { prompt: string | null; isCustom: boolean }) => void;
  onBack: () => void;
}

export function StepTwo({ agentTemplateId, onComplete, onBack }: StepTwoProps) {
  const { data, isLoading } = useAgentTemplates();
  const [prompt, setPrompt] = useState("");
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [hasConfirmedCustom, setHasConfirmedCustom] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const template = useMemo(() => {
    return data?.agentTemplates?.find((t) => t.id === agentTemplateId);
  }, [data, agentTemplateId]);

  const basePrompt = template?.basePrompt ?? "";

  // Check if prompt has been modified from base
  const isPromptModified = useMemo(() => {
    return prompt !== basePrompt && basePrompt !== "";
  }, [prompt, basePrompt]);

  // Initialize prompt with template's basePrompt
  useEffect(() => {
    if (template?.basePrompt) {
      setPrompt(template.basePrompt);
    }
  }, [template]);

  // Debounced effect to show dialog when prompt is modified
  useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If prompt is modified and user hasn't already confirmed custom
    if (isPromptModified && !hasConfirmedCustom) {
      debounceTimerRef.current = setTimeout(() => {
        setShowCustomDialog(true);
      }, 1000); // 1 second debounce
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isPromptModified, hasConfirmedCustom]);

  const handleConfirmCustom = useCallback(() => {
    setHasConfirmedCustom(true);
    setShowCustomDialog(false);
  }, []);

  const handleCancelCustom = useCallback(() => {
    // Revert to base prompt
    setPrompt(basePrompt);
    setHasConfirmedCustom(false);
    setShowCustomDialog(false);
  }, [basePrompt]);

  const handleContinue = () => {
    // Determine if this is a custom agent
    const isCustom = isPromptModified && hasConfirmedCustom;

    onComplete({
      prompt: isCustom ? prompt : null,
      isCustom,
    });
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
        <h2 className="text-2xl font-semibold">Review Instructions</h2>
        <p className="text-muted-foreground">
          Review the instructions for {template.name}. Edit them to create a
          custom agent, or continue to use the managed template.
        </p>
      </div>

      {/* Custom agent indicator */}
      {hasConfirmedCustom && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            You are creating a <strong>custom agent</strong>. Changes to the
            original template will not be reflected in your agent.
          </p>
        </div>
      )}

      {/* Prompt Editor */}
      <div className="space-y-2">
        <PromptEditor
          value={prompt}
          onChange={setPrompt}
          placeholder="Enter the agent instructions..."
        />
        <p className="text-xs text-muted-foreground">
          {hasConfirmedCustom
            ? "Your custom instructions will be used."
            : "Leave unchanged to receive automatic updates from DevFleet."}
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

      {/* Custom Agent Confirmation Dialog */}
      <AlertDialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create a Custom Agent?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ve modified the instructions. Do you want to create a
              custom agent with your changes? Custom agents won&apos;t receive
              automatic updates when DevFleet improves the template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelCustom}>
              Use Original Template
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCustom}>
              Create Custom Agent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
