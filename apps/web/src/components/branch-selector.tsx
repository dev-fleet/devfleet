"use client";

import { useState, useEffect } from "react";
import { GitBranch, Search, Loader } from "lucide-react";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import { getBranches } from "@/actions/github";

interface Branch {
  name: string;
  protected: boolean;
}

interface BranchSelectorProps {
  selectedBranch: string | undefined;
  onBranchChange: (branch: string) => void;
  repositoryFullName: string;
  organizationId: string;
  defaultBranch?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function BranchSelector({
  selectedBranch,
  onBranchChange,
  repositoryFullName,
  organizationId,
  defaultBranch,
  placeholder = "Select branch",
  className,
  disabled = false,
}: BranchSelectorProps) {
  const isMobile = useIsMobile();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branchesFetched, setBranchesFetched] = useState(false);
  const [branchSearch, setBranchSearch] = useState("");

  // Filter branches based on search term
  const filteredBranches = branches.filter((branch) =>
    branch.name.toLowerCase().includes(branchSearch.toLowerCase())
  );

  // Reset branches when repository changes
  useEffect(() => {
    setBranches([]);
    setBranchesFetched(false);
    setBranchSearch("");
  }, [repositoryFullName, organizationId]);

  // Fetch branches when dropdown is opened
  const handleBranchDropdownOpen = async (open: boolean) => {
    if (open && !branchesFetched && !loadingBranches) {
      setLoadingBranches(true);
      try {
        const [owner, repo] = repositoryFullName.split("/");
        if (!owner || !repo) {
          throw new Error("Invalid repository name format");
        }
        const branchData = await getBranches(owner, repo, organizationId);
        setBranches(branchData);
        setBranchesFetched(true);
      } catch (error) {
        console.error("Failed to fetch branches:", error);
        setBranches([]);
      } finally {
        setLoadingBranches(false);
      }
    }
  };

  const handleBranchSelect = (value: string) => {
    onBranchChange(value);
    setBranchSearch(""); // Clear search when selecting
  };

  return (
    <Select
      value={selectedBranch ?? ""}
      onValueChange={handleBranchSelect}
      onOpenChange={handleBranchDropdownOpen}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        {isMobile ? (
          <GitBranch className="h-4 w-4" />
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>

      <SelectContent>
        <div className="p-1 mb-1 border-b sticky top-0 bg-background">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search branches..."
              value={branchSearch}
              onChange={(e) => setBranchSearch(e.target.value)}
              className="h-8 pl-7 text-xs border-none shadow-none focus:ring-0 focus:shadow-none focus:outline-none focus-visible:ring-0 focus-visible:outline-none"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        {!branchesFetched && loadingBranches ? (
          <>
            {/* Show selected branch */}
            {selectedBranch && (
              <SelectItem
                key={selectedBranch}
                value={selectedBranch}
                className="flex items-center gap-2"
              >
                <GitBranch className="h-4 w-4" />
                {selectedBranch}
              </SelectItem>
            )}

            {/* Show loading item */}
            <div className="px-2 py-2 text-sm text-muted-foreground flex items-center gap-2">
              <Loader className="h-4 w-4 animate-spin" />
              Loading
            </div>
          </>
        ) : (
          <>
            {/* Always show the currently selected branch if it exists and not in filtered results */}
            {selectedBranch &&
              !filteredBranches.some((b) => b.name === selectedBranch) && (
                <SelectItem
                  key={selectedBranch}
                  value={selectedBranch}
                  className="flex items-center gap-2"
                >
                  <GitBranch className="h-4 w-4" />
                  {selectedBranch}
                </SelectItem>
              )}

            {filteredBranches.length === 0 && branchesFetched ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                No branches found
              </div>
            ) : (
              filteredBranches.map((branch) => (
                <SelectItem
                  key={branch.name}
                  value={branch.name}
                  className="flex items-center gap-2"
                >
                  <div className="flex items-center gap-2 w-full">
                    <GitBranch className="h-4 w-4" />
                    <span className="flex-1">{branch.name}</span>
                    <div className="flex items-center gap-1">
                      {branch.protected && (
                        <Badge variant="secondary" className="text-xs">
                          Protected
                        </Badge>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))
            )}
          </>
        )}
      </SelectContent>
    </Select>
  );
}
