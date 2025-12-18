"use client";

import { useState, useMemo } from "react";
import { useRepositories } from "@/utils/swr/repositories";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Switch } from "@workspace/ui/components/switch";
import { Badge } from "@workspace/ui/components/badge";
import { Loader2, GitBranch, Circle } from "lucide-react";

interface StepThreeProps {
  onComplete: (repositoryIds: string[]) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export function StepThree({
  onComplete,
  onBack,
  isSubmitting,
}: StepThreeProps) {
  // Fetch a large page to get all repos for selection
  const { data, isLoading, error } = useRepositories({ limit: 1000 });
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const repositories = useMemo(() => {
    return data?.data ?? [];
  }, [data]);

  // Filter repositories based on search query
  const filteredRepositories = useMemo(() => {
    if (searchQuery === "") return repositories;

    return repositories.filter((repo) => {
      const matchesName = repo.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesDescription =
        repo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        false;

      return matchesName || matchesDescription;
    });
  }, [repositories, searchQuery]);

  const handleToggle = (repoId: string) => {
    setSelectedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(repoId)) {
        next.delete(repoId);
      } else {
        next.add(repoId);
      }
      return next;
    });
  };

  const handleToggleAll = (enabled: boolean) => {
    if (enabled) {
      setSelectedRepos(new Set(filteredRepositories.map((r) => r.id)));
    } else {
      setSelectedRepos(new Set());
    }
  };

  const handleFinalize = () => {
    onComplete(Array.from(selectedRepos));
  };

  const allFilteredSelected =
    filteredRepositories.length > 0 &&
    filteredRepositories.every((repo) => selectedRepos.has(repo.id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
        <p className="text-sm text-destructive">
          Failed to load repositories. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Select Repositories</h2>
        <p className="text-muted-foreground">
          Choose which repositories to apply this agent to. You can change this
          later.
        </p>
      </div>

      {/* Search and controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Input
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            {selectedRepos.size} of {repositories.length} repositories selected
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleToggleAll(!allFilteredSelected)}
          disabled={isSubmitting || filteredRepositories.length === 0}
        >
          {allFilteredSelected ? "Disable All" : "Enable All"}
        </Button>
      </div>

      {/* Repositories list */}
      <div className="overflow-hidden rounded-md border">
        {filteredRepositories.map((repo, index) => {
          const isSelected = selectedRepos.has(repo.id);
          const isLast = index === filteredRepositories.length - 1;

          return (
            <div key={repo.id} className={!isLast ? "border-b" : ""}>
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                {/* Status icon */}
                <Circle
                  className={`h-3 w-3 ${
                    isSelected
                      ? "fill-green-500 text-green-500"
                      : "fill-muted text-muted"
                  }`}
                />

                {/* Repository icon */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <GitBranch className="h-4 w-4 text-primary" />
                </div>

                {/* Repository info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{repo.name}</span>
                    {repo.private && (
                      <Badge variant="outline" className="text-xs">
                        Private
                      </Badge>
                    )}
                  </div>
                  {repo.description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {repo.description}
                    </p>
                  )}
                </div>

                {/* Branch info */}
                {repo.defaultBranch && (
                  <span className="text-sm text-muted-foreground">
                    {repo.defaultBranch}
                  </span>
                )}

                {/* Toggle switch */}
                <Switch
                  checked={isSelected}
                  onCheckedChange={() => handleToggle(repo.id)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          );
        })}
      </div>

      {filteredRepositories.length === 0 && repositories.length > 0 && (
        <div className="py-8 text-center text-muted-foreground">
          No repositories match your search
        </div>
      )}

      {repositories.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          No repositories available. Please connect your GitHub repositories
          first.
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between border-t pt-6">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button
          onClick={handleFinalize}
          disabled={isSubmitting || selectedRepos.size === 0}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Agent...
            </>
          ) : (
            "Finalize & Create Agent"
          )}
        </Button>
      </div>
    </div>
  );
}
