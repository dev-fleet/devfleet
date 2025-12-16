"use client";

import { useState } from "react";
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@workspace/ui/components/pagination";
import { useDebounce } from "@workspace/ui/hooks/use-debounce";
import { GitBranch } from "lucide-react";
import Link from "next/link";
import { useRepositories } from "@/utils/swr/repositories";

const ITEMS_PER_PAGE = 25;

export function ReposTableClient() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search to avoid excessive API calls
  const debouncedSetSearch = useDebounce((value: string) => {
    setDebouncedSearch(value);
    setCurrentPage(1); // Reset to page 1 when search changes
  }, 300);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    debouncedSetSearch(value);
  };

  const { data, error, isLoading } = useRepositories({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    search: debouncedSearch || undefined,
  });

  const repos = data?.data ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 0;
  const total = pagination?.total ?? 0;

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      ) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  const startItem =
    repos.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const endItem = (currentPage - 1) * ITEMS_PER_PAGE + repos.length;

  return (
    <>
      <div className="flex gap-4 items-center justify-between">
        <Input
          placeholder="Search repositories..."
          value={searchInput}
          onChange={handleSearchChange}
          className="max-w-sm"
        />
        {total > 0 && (
          <span className="text-sm text-muted-foreground">
            Showing {startItem}-{endItem} of {total} repositories
          </span>
        )}
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
            {!error && isLoading && !data && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center text-muted-foreground"
                >
                  Loading repositories...
                </TableCell>
              </TableRow>
            )}
            {!error && data && repos.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center text-muted-foreground"
                >
                  No repositories found
                </TableCell>
              </TableRow>
            )}
            {repos.length > 0 &&
              repos.map((repo) => (
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

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-disabled={currentPage === 1}
                className={
                  currentPage === 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
            {getPageNumbers().map((page, idx) =>
              page === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => setCurrentPage(page)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                aria-disabled={currentPage === totalPages}
                className={
                  currentPage === totalPages
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </>
  );
}
