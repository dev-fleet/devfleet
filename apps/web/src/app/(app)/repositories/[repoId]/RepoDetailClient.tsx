"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { InsetHeader } from "@/components/sidebar/inset-header";
import { ExternalLink } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { AddAgentDialog } from "./add-agent-dialog";
import { AgentsList } from "./agents-list";
import { useRepository } from "@/hooks/useRepository";
import { useRepositoryAgents } from "@/hooks/useRepositoryAgents";
import { useRepositoryPullRequests } from "@/hooks/useRepositoryPullRequests";
import { useOrganizationAgents } from "@/hooks/useOrganizationAgents";

export function RepoDetailClient({ repoId }: { repoId: string }) {
  const {
    data: repository,
    isLoading: repoLoading,
    error: repoError,
  } = useRepository(repoId);
  const {
    data: repoAgents,
    isLoading: agentsLoading,
    error: agentsError,
  } = useRepositoryAgents(repoId);
  const {
    data: pullRequests,
    isLoading: prsLoading,
    error: prsError,
  } = useRepositoryPullRequests(repoId);
  const {
    data: orgAgents,
    isLoading: orgAgentsLoading,
    error: orgAgentsError,
  } = useOrganizationAgents();

  const isLoading =
    repoLoading || agentsLoading || prsLoading || orgAgentsLoading;
  const error = repoError || agentsError || prsError || orgAgentsError;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (error || !repository || !repoAgents || !pullRequests || !orgAgents) {
    return (
      <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="text-destructive">
          Failed to load repository details.
        </div>
      </div>
    );
  }

  return (
    <>
      <InsetHeader title={repository.name} />
      <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        {/* Repository Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{repository.name}</h1>
              {repository.description && (
                <p className="text-muted-foreground mt-1">
                  {repository.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span>Default branch: {repository.defaultBranch}</span>
                <Button variant="link" className="h-auto p-0" size="sm" asChild>
                  <a
                    href={repository.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    View on GitHub
                    <ExternalLink />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Active Agents */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Active Agents</h2>
              <p className="text-sm text-muted-foreground">
                Manage agents that run on PRs for this repository
              </p>
            </div>
            <AddAgentDialog
              repoId={repoId}
              orgAgents={orgAgents}
              currentAgentIds={repoAgents.map((ra) => ra.agentId)}
            />
          </div>
          {repoAgents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No agents configured for this repository
            </div>
          ) : (
            <AgentsList agents={repoAgents} />
          )}
        </div>

        <Separator />

        {/* Recent PRs */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Recent Pull Requests</h2>
            <p className="text-sm text-muted-foreground">
              Latest pull requests for this repository
            </p>
          </div>
          {pullRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pull requests found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PR</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead className="text-center">Gate</TableHead>
                  <TableHead>Failing Agents</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pullRequests.map((pr) => (
                  <TableRow key={pr.id}>
                    <TableCell>
                      <Link
                        href={pr.htmlUrl || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:underline flex items-center gap-1"
                      >
                        #{pr.prNumber} {pr.title}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          pr.state === "open"
                            ? "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20 hover:bg-green-500/25"
                            : pr.state === "merged"
                              ? "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/25"
                              : "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20 hover:bg-red-500/25"
                        }
                      >
                        {pr.state}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        @{pr.authorLogin}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          pr.gateStatus === "pass"
                            ? "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20 hover:bg-green-500/25"
                            : pr.gateStatus === "fail"
                              ? "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20 hover:bg-red-500/25"
                              : "bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/20 hover:bg-gray-500/25"
                        }
                      >
                        {pr.gateStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {pr.failingAgents.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {pr.failingAgents.map((agentName, idx) => (
                            <Badge key={idx} variant="outline">
                              {agentName}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          None
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(pr.updatedAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </>
  );
}
