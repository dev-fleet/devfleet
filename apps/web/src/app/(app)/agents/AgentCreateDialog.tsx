"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Button } from "@workspace/ui/components/button";
import { createAgent } from "@/actions/agents";
import { toast } from "sonner";

export function AgentCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}) {
  const [name, setName] = useState("");
  const [engine, setEngine] = useState<"anthropic" | "openai">("anthropic");
  const [prompt, setPrompt] = useState("");
  const [languageFilter, setLanguageFilter] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setName("");
    setEngine("anthropic");
    setPrompt("");
    setLanguageFilter("");
  }, []);

  const onSubmit = useCallback(async () => {
    try {
      setSubmitting(true);
      if (!name.trim() || !prompt.trim()) {
        toast.error("Name and prompt are required");
        return;
      }
      await createAgent({
        name: name.trim(),
        prompt: prompt.trim(),
        engine,
        languageFilter: languageFilter.trim() || null,
      });
      toast.success("Agent created");
      onOpenChange(false);
      reset();
      onCreated?.();
    } catch (e) {
      toast.error("Failed to create agent");
    } finally {
      setSubmitting(false);
    }
  }, [name, prompt, engine, languageFilter, onOpenChange, onCreated, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New agent</DialogTitle>
          <DialogDescription>
            Create an organization-owned agent to reuse across repositories.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Mode</label>
            <Select value={engine} onValueChange={(v) => setEngine(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Prompt</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={8}
              placeholder="System prompt for this agent"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">
              Language filter (optional)
            </label>
            <Input
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              placeholder="e.g., TypeScript, Python"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
