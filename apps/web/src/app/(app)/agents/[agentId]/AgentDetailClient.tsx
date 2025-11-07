"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAgentDetail } from "@/utils/swr/agents";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Card } from "@workspace/ui/components/card";
import { toast } from "sonner";
import { updateAgent } from "@/actions/agents";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

export function AgentDetailClient({ agentId }: { agentId: string }) {
  const { data, error, mutate } = useAgentDetail(agentId);

  const [name, setName] = useState("");
  const [engine, setEngine] = useState<"anthropic" | "openai">("anthropic");
  const [prompt, setPrompt] = useState("");
  const [languageFilter, setLanguageFilter] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testDiff, setTestDiff] = useState("");

  useEffect(() => {
    if (!data?.agent) return;
    setName(data.agent.name);
    setEngine(data.agent.engine as any);
    setPrompt(data.agent.prompt);
    setLanguageFilter(data.agent.description ?? "");
  }, [data]);

  const onSave = useCallback(async () => {
    try {
      setSaving(true);
      await updateAgent(agentId, {
        name: name.trim(),
        prompt: prompt.trim(),
        engine,
        languageFilter: languageFilter.trim() || null,
      });
      toast.success("Agent saved");
      mutate();
    } catch (e) {
      toast.error("Failed to save agent");
    } finally {
      setSaving(false);
    }
  }, [agentId, name, prompt, engine, languageFilter, mutate]);

  const reposUsing = useMemo(() => data?.reposUsing ?? [], [data]);
  const recentRuns = useMemo(() => data?.recentRuns ?? [], [data]);

  return (
    <div className="grid gap-8">
      <Card className="p-4 sm:p-6">
        <div className="grid gap-4">
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
              rows={12}
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
          <div className="flex gap-2 justify-end">
            <Button variant="outline" asChild>
              <Link href="/repositories">Go to repositories</Link>
            </Button>
            <Button variant="secondary" onClick={() => setTestOpen(true)}>
              Quick test
            </Button>
            <Button onClick={onSave} disabled={saving}>
              Save
            </Button>
          </div>
        </div>
      </Card>

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
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Repo</TableHead>
                  <TableHead className="text-center">Enabled</TableHead>
                  <TableHead className="text-center">Order</TableHead>
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
                      <TableCell className="text-center">{r.order}</TableCell>
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
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Repo / PR</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="text-right">Runtime</TableHead>
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
                      <TableCell>
                        <span className="line-clamp-1 text-muted-foreground text-sm">
                          {run.message}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {run.runtimeMs} ms
                      </TableCell>
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
