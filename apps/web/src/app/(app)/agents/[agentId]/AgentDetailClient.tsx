"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAgentDetail } from "@/utils/swr/agents";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Button } from "@workspace/ui/components/button";
import { PromptEditor } from "@/components/prompt-editor";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { toast } from "sonner";
import {
  updateAgent,
  updateAgentPrompt,
  convertToCustomAgent,
} from "@/actions/agents";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Spinner } from "@workspace/ui/components/spinner";
import { Kbd } from "@workspace/ui/components/kbd";
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemActions,
} from "@workspace/ui/components/item";
import { Info } from "lucide-react";

export function AgentDetailClient({ agentId }: { agentId: string }) {
  const { data, error, mutate } = useAgentDetail(agentId);

  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [initialName, setInitialName] = useState("");
  const [initialPrompt, setInitialPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testDiff, setTestDiff] = useState("");
  const [convertModalOpen, setConvertModalOpen] = useState(false);

  useEffect(() => {
    if (!data?.agent) return;
    const agentName = data.agent.name;
    const agentPrompt =
      data.agent.prompt ?? data.agentTemplate?.basePrompt ?? "";
    setName(agentName);
    setPrompt(agentPrompt);
    setInitialName(agentName);
    setInitialPrompt(agentPrompt);
  }, [data]);

  // Determine if agent is managed (has template) or custom (no template)
  const isManaged = !!data?.agent?.agentTemplateId;

  const hasUnsavedChanges = useMemo(() => {
    const nameChanged = name.trim() !== initialName;
    const promptChanged = prompt.trim() !== initialPrompt;
    return nameChanged || promptChanged;
  }, [name, prompt, initialName, initialPrompt]);

  const handleDiscard = () => {
    setName(initialName);
    setPrompt(initialPrompt);
  };

  // Perform the actual save operation
  const performSave = useCallback(
    async (shouldConvertToCustom: boolean) => {
      const trimmedName = name.trim();
      const trimmedPrompt = prompt.trim();

      try {
        setSaving(true);

        const nameChanged = trimmedName !== initialName;
        const promptChanged = trimmedPrompt !== initialPrompt;

        if (nameChanged) {
          await updateAgent(agentId, { name: trimmedName });
        }

        if (promptChanged) {
          if (shouldConvertToCustom) {
            await convertToCustomAgent(agentId, trimmedPrompt);
          } else {
            await updateAgentPrompt(agentId, trimmedPrompt);
          }
        }

        // Update initial values to match saved state
        setInitialName(trimmedName);
        setInitialPrompt(trimmedPrompt);

        toast.success("Changes saved");
        mutate();
      } catch {
        toast.error("Failed to save changes");
      } finally {
        setSaving(false);
      }
    },
    [name, prompt, initialName, initialPrompt, agentId, mutate]
  );

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    const trimmedPrompt = prompt.trim();

    if (!trimmedName) {
      toast.error("Name cannot be empty");
      return;
    }

    if (!trimmedPrompt) {
      toast.error("Prompt cannot be empty");
      return;
    }

    const promptChanged = trimmedPrompt !== initialPrompt;

    // If managed agent and prompt changed, show confirmation modal
    if (isManaged && promptChanged) {
      setConvertModalOpen(true);
      return;
    }

    // Otherwise save directly
    await performSave(false);
  }, [name, prompt, initialPrompt, isManaged, performSave]);

  const handleConfirmConvert = useCallback(async () => {
    setConvertModalOpen(false);
    await performSave(true);
  }, [performSave]);

  // Global keyboard shortcut: ⌘ + Enter to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === "Enter" && hasUnsavedChanges && !saving) {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasUnsavedChanges, saving, handleSave]);

  const reposUsing = useMemo(() => data?.reposUsing ?? [], [data]);
  const recentRuns = useMemo(() => data?.recentRuns ?? [], [data]);

  return (
    <div className="grid gap-8">
      {/* Agent Info Section */}
      <div className="grid gap-6">
        <h2 className="text-lg font-semibold">Agent Details</h2>
        {/* Name */}
        <div className="grid gap-2">
          <label className="text-sm font-medium">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {/* Type */}
        <div className="grid gap-2">
          <label className="text-sm font-medium">Type</label>
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground">
              {isManaged ? "Managed" : "Custom"}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Info className="h-4 w-4" />
                  <span className="sr-only">Agent type info</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs" side="bottom" align="start">
                {isManaged ? (
                  <p>
                    This agent is subscribed to a DevFleet template. When the
                    template is improved, your agent will automatically receive
                    updates.
                  </p>
                ) : (
                  <p>
                    This is a custom agent with your own instructions. It
                    won&apos;t receive automatic updates from DevFleet
                    templates.
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </div>
          {isManaged && data?.agentTemplate && (
            <p className="text-sm text-muted-foreground">
              Based on{" "}
              <span className="font-medium">{data.agentTemplate.name}</span>
            </p>
          )}
        </div>
      </div>

      {/* Prompt Editor Section */}
      <div className="grid gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Agent Instructions</h2>
          <p className="text-sm text-muted-foreground">
            Define what this agent will look for when reviewing pull requests.
          </p>
        </div>
        <PromptEditor
          value={prompt}
          onChange={setPrompt}
          placeholder="Enter the agent instructions..."
        />
      </div>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Quick test</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Paste a diff to test</label>
            <Textarea
              value={testDiff}
              onChange={(e) => setTestDiff(e.target.value)}
              rows={10}
              placeholder={"diff --git a/file.txt b/file.txt\n..."}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTestOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.info("Quick test is not implemented yet");
                setTestOpen(false);
              }}
            >
              Run test
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Convert to Custom Agent Confirmation Modal */}
      <Dialog open={convertModalOpen} onOpenChange={setConvertModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convert to custom agent?</DialogTitle>
            <DialogDescription>
              Changing the prompt will convert this managed agent to a custom
              agent. It will no longer receive automatic updates from the
              DevFleet template.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConvertModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmConvert} disabled={saving}>
              {saving ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Saving...
                </>
              ) : (
                "Convert and Save"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6">
        <div className="grid gap-2">
          <h3 className="text-base font-semibold">Repos Using</h3>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Repo</TableHead>
                  <TableHead className="text-center">Enabled</TableHead>
                  <TableHead>Last run status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reposUsing.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground"
                    >
                      Not used by any repositories
                    </TableCell>
                  </TableRow>
                ) : (
                  reposUsing.map((r) => (
                    <TableRow key={r.repoId}>
                      <TableCell>
                        <Link
                          href={`/repositories/${r.repoId}`}
                          className="hover:underline"
                        >
                          {r.repoName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center">
                        {r.enabled ? "Yes" : "No"}
                      </TableCell>
                      <TableCell>
                        <span className="capitalize">
                          {r.lastRunStatus ?? "—"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="grid gap-2">
          <h3 className="text-base font-semibold">Recent Runs</h3>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Repo / PR</TableHead>
                  <TableHead>Runtime</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRuns.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground"
                    >
                      No recent runs
                    </TableCell>
                  </TableRow>
                ) : (
                  recentRuns.map((run, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="capitalize">{run.status}</TableCell>
                      <TableCell>
                        {run.repoName} / #{run.prNumber}
                      </TableCell>
                      <TableCell>{run.runtimeMs} ms</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Bar */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-6 left-1/2 z-50 w-full max-w-2xl -translate-x-1/2 px-4">
          <Item variant="outline" size="sm" className="bg-background shadow-lg">
            <ItemContent>
              <ItemTitle>Unsaved changes</ItemTitle>
            </ItemContent>
            <ItemActions>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDiscard}
                disabled={saving}
              >
                Discard
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save Changes
                    <Kbd className="ml-2">⌘↵</Kbd>
                  </>
                )}
              </Button>
            </ItemActions>
          </Item>
        </div>
      )}
    </div>
  );
}
