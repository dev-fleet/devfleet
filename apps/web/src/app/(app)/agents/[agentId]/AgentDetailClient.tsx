"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useAgentDetail } from "@/utils/swr/agents";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { toast } from "sonner";
import { updateAgent, updateAgentPrompt } from "@/actions/agents";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { useDebounce } from "@workspace/ui/hooks/use-debounce";
import { Spinner } from "@workspace/ui/components/spinner";

export function AgentDetailClient({ agentId }: { agentId: string }) {
  const { data, error, mutate } = useAgentDetail(agentId);

  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testDiff, setTestDiff] = useState("");

  const initialNameRef = useRef<string | null>(null);
  const initialPromptRef = useRef<string | null>(null);

  useEffect(() => {
    if (!data?.agent) return;
    setName(data.agent.name);
    setPrompt(data.agent.prompt ?? data.agentTemplate?.basePrompt ?? "");
    initialNameRef.current = data.agent.name;
    initialPromptRef.current =
      data.agent.prompt ?? data.agentTemplate?.basePrompt ?? "";
  }, [data]);

  const saveName = useDebounce(async (newName: string) => {
    const trimmedName = newName.trim();
    if (!trimmedName || trimmedName === initialNameRef.current) return;

    try {
      setSavingName(true);
      await updateAgent(agentId, { name: trimmedName });
      initialNameRef.current = trimmedName;
      toast.success("Name saved");
      mutate();
    } catch {
      toast.error("Failed to save name");
    } finally {
      setSavingName(false);
    }
  }, 500);

  const savePrompt = useDebounce(async (newPrompt: string) => {
    const trimmedPrompt = newPrompt.trim();
    if (trimmedPrompt === initialPromptRef.current) return;

    // Don't save empty prompts - the workflow will fall back to basePrompt
    if (!trimmedPrompt) {
      toast.error("Prompt cannot be empty");
      return;
    }

    try {
      setSavingPrompt(true);
      await updateAgentPrompt(agentId, trimmedPrompt);
      initialPromptRef.current = trimmedPrompt;
      toast.success("Prompt saved");
      mutate();
    } catch {
      toast.error("Failed to save prompt");
    } finally {
      setSavingPrompt(false);
    }
  }, 1000);

  const reposUsing = useMemo(() => data?.reposUsing ?? [], [data]);
  const recentRuns = useMemo(() => data?.recentRuns ?? [], [data]);

  return (
    <div className="grid gap-8">
      {/* Agent Info Section */}
      <div className="grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Name</label>
          <div className="relative">
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                saveName(e.target.value);
              }}
              className="pr-9"
            />
            {savingName && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Spinner className="text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prompt Editor Section */}
      <div className="grid gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Prompt</h2>
            {savingPrompt && (
              <Spinner className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Define what this agent looks for when reviewing pull requests
          </p>
        </div>
        <Textarea
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            savePrompt(e.target.value);
          }}
          placeholder="Enter the agent prompt..."
          className="min-h-[400px] font-mono text-sm"
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
    </div>
  );
}
