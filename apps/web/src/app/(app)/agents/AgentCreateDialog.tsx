"use client";

import { useState, useCallback, useMemo } from "react";
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
import { useAgentTypes } from "@/hooks/useAgentTypes";
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
  const { data: agentTypesData, isLoading } = useAgentTypes();
  const [name, setName] = useState("");
  const [engine, setEngine] = useState<"anthropic" | "openai">("anthropic");
  const [agentTemplateId, setAgentTemplateId] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const agentTemplates = useMemo(
    () => agentTypesData?.agentTemplates ?? [],
    [agentTypesData]
  );

  const selectedAgentTemplate = useMemo(
    () => agentTemplates.find((t) => t.id === agentTemplateId),
    [agentTemplates, agentTemplateId]
  );

  const reset = useCallback(() => {
    setName("");
    setEngine("anthropic");
    setAgentTemplateId("");
    setDescription("");
  }, []);

  const onSubmit = useCallback(async () => {
    try {
      setSubmitting(true);
      if (!name.trim()) {
        toast.error("Name is required");
        return;
      }
      if (!agentTemplateId) {
        toast.error("Please select an agent template");
        return;
      }
      await createAgent({
        name: name.trim(),
        agentTemplateId,
        engine,
        description: description.trim() || null,
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
  }, [
    name,
    agentTemplateId,
    engine,
    description,
    onOpenChange,
    onCreated,
    reset,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New agent</DialogTitle>
          <DialogDescription>
            Create an agent from a template that you can customize.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Agent Template</label>
            <Select
              value={agentTemplateId}
              onValueChange={setAgentTemplateId}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select agent template" />
              </SelectTrigger>
              <SelectContent>
                {agentTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAgentTemplate && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="text-muted-foreground">
                  {selectedAgentTemplate.description}
                </p>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My TypeScript Agent"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Engine</label>
            <Select value={engine} onValueChange={(v) => setEngine(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select engine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">
              Description (optional)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Add a description to help identify this agent"
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
          <Button onClick={onSubmit} disabled={submitting || isLoading}>
            Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
