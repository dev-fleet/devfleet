"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { MoreHorizontal, Plus } from "lucide-react";
import { useAgents } from "@/utils/swr/agents";
import { toast } from "sonner";
import { archiveAgent, duplicateAgent } from "@/actions/agents";

export function AgentsTableClient() {
  const router = useRouter();
  const { data, error, mutate } = useAgents();
  const [searchQuery, setSearchQuery] = useState("");

  const agents = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    if (!searchQuery) return agents;
    return agents.filter((a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [agents, searchQuery]);

  const onArchive = useCallback(
    async (agentId: string) => {
      try {
        await archiveAgent(agentId);
        toast.success("Agent archived");
        mutate();
      } catch (e) {
        toast.error("Failed to archive agent");
      }
    },
    [mutate]
  );

  const onDuplicate = useCallback(
    async (agentId: string) => {
      try {
        const result = await duplicateAgent(agentId);
        toast.success("Agent duplicated");
        mutate();
        // Optionally navigate to new agent
        // router.push(`/dashboard/agents/${result.id}`)
      } catch (e) {
        toast.error("Failed to duplicate agent");
      }
    },
    [mutate]
  );

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search agents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => router.push("/agents/new")}>
          <Plus className="h-4 w-4 mr-2" /> New agent
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead className="text-center">Repos using</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-center">Enabled repos</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {error && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-destructive">
                  Failed to load agents
                </TableCell>
              </TableRow>
            )}
            {!error && !data && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  Loading agents...
                </TableCell>
              </TableRow>
            )}
            {filtered.length === 0 && data && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  No agents found
                </TableCell>
              </TableRow>
            )}
            {filtered.map((agent) => (
              <TableRow key={agent.id} className="hover:bg-muted/50">
                <TableCell>
                  <Link
                    href={`/dashboard/agents/${agent.id}`}
                    className="block"
                  >
                    <span className="font-medium hover:underline">
                      {agent.name}
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="capitalize">{agent.engine}</TableCell>
                <TableCell className="text-center">
                  {agent.reposUsingCount ?? 0}
                </TableCell>
                <TableCell>
                  {agent.updatedAt ? (
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(
                        new Date(agent.updatedAt as unknown as string),
                        {
                          addSuffix: true,
                        }
                      )}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {agent.enabledReposCount ?? 0}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/agents/${agent.id}`}>
                          Open detail
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/agents/${agent.id}`}>Edit</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicate(agent.id)}>
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onArchive(agent.id)}>
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
