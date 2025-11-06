"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Badge } from "@workspace/ui/components/badge";
import { GitBranch } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useRepositories } from "@/utils/swr/repositories";
import type { RepositoryResponse } from "@/app/api/repositories/route";

export function ReposTableClient() {
  const { data, error } = useRepositories();
  const repositories = useMemo(() => {
    const items = (data ?? []) as RepositoryResponse;
    type RepoWithOptionalExtras = RepositoryResponse[number] &
      Partial<{ gatePassPercentage: number; errors24h: number }>;
    return (items as RepoWithOptionalExtras[]).map((repo) => ({
      gatePassPercentage: repo.gatePassPercentage ?? null,
      errors24h: repo.errors24h ?? 0,
      ...repo,
    }));
  }, [data]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBy, setFilterBy] = useState<string>("all");

  const filteredRepos = useMemo(() => {
    let filtered = repositories;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((repo) =>
        repo.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (filterBy === "failing") {
      filtered = filtered.filter((repo) => repo.errors24h > 0);
    }

    return filtered;
  }, [repositories, searchQuery, filterBy]);

  return (
    <>
      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search repositories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filterBy} onValueChange={setFilterBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All repositories</SelectItem>
            <SelectItem value="failing">Has failing PRs</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Repository</TableHead>
              <TableHead className="text-center">Open PRs</TableHead>
              <TableHead className="text-center">Gate Pass %</TableHead>
              <TableHead className="text-center">Active Agents</TableHead>
              <TableHead className="text-center">Errors 24h</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {error && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-destructive">
                  Failed to load repositories
                </TableCell>
              </TableRow>
            )}
            {!error && !data && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  Loading repositories...
                </TableCell>
              </TableRow>
            )}
            {filteredRepos.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  No repositories found
                </TableCell>
              </TableRow>
            ) : (
              filteredRepos.map((repo) => (
                <TableRow
                  key={repo.id}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell>
                    <Link href={`/repositories/${repo.id}`} className="block">
                      <div className="flex items-start gap-3">
                        <GitBranch className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex flex-col">
                          <span className="font-medium hover:underline">
                            {repo.name}
                          </span>
                          {repo.description && (
                            <span className="text-sm text-muted-foreground line-clamp-1">
                              {repo.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">
                    <Link href={`/repositories/${repo.id}`}>
                      <Badge
                        variant={repo.openPRs > 0 ? "default" : "secondary"}
                      >
                        {repo.openPRs}
                      </Badge>
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">
                    <Link href={`/repositories/${repo.id}`}>
                      {repo.gatePassPercentage !== null ? (
                        <Badge
                          variant={
                            repo.gatePassPercentage >= 80
                              ? "default"
                              : repo.gatePassPercentage >= 50
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {repo.gatePassPercentage}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          N/A
                        </span>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">
                    <Link href={`/repositories/${repo.id}`}>
                      {repo.activeAgents}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">
                    <Link href={`/repositories/${repo.id}`}>
                      <span className="text-muted-foreground">
                        {repo.errors24h}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/repositories/${repo.id}`}>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(repo.updatedAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
