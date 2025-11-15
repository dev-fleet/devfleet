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
import { Badge } from "@workspace/ui/components/badge";
import { GitBranch } from "lucide-react";
import Link from "next/link";
import { useRepositories } from "@/utils/swr/repositories";
import type { RepositoryResponse } from "@/app/api/repositories/route";

export function ReposTableClient() {
  const { data, error } = useRepositories();
  const [searchQuery, setSearchQuery] = useState("");

  const repositories = useMemo(
    () => (data ?? []) as RepositoryResponse,
    [data]
  );

  const filteredRepos = useMemo(() => {
    let filtered = repositories;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((repo) =>
        repo.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [repositories, searchQuery]);

  return (
    <>
      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search repositories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Repository</TableHead>
              <TableHead className="text-center">Open PRs</TableHead>
              <TableHead className="text-center">Active Agents</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {error && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-destructive">
                  Failed to load repositories
                </TableCell>
              </TableRow>
            )}
            {!error && !data && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center text-muted-foreground"
                >
                  Loading repositories...
                </TableCell>
              </TableRow>
            )}
            {!error && data && filteredRepos.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center text-muted-foreground"
                >
                  No repositories found
                </TableCell>
              </TableRow>
            )}
            {data &&
              filteredRepos.length > 0 &&
              filteredRepos.map((repo) => (
                <TableRow
                  key={repo.id}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell>
                    <Link href={`/repositories/${repo.id}`} className="block">
                      <div className="flex items-start gap-3">
                        <GitBranch className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex flex-col min-w-0 flex-1 max-w-md">
                          <span className="font-medium hover:underline truncate">
                            {repo.name}
                          </span>
                          {repo.description && (
                            <span className="text-sm text-muted-foreground truncate">
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
                      {repo.activeAgents}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
