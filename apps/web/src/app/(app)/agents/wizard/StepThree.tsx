"use client";

import { useState, useMemo } from "react";
import { useRepositories } from "@/utils/swr/repositories";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Switch } from "@workspace/ui/components/switch";
import { Loader2, GitBranch } from "lucide-react";

interface StepThreeProps {
  onComplete: (repositoryIds: string[]) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export function StepThree({ onComplete, onBack, isSubmitting }: StepThreeProps) {
  const { data, isLoading, error } = useRepositories();
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());

  const repositories = useMemo(() => {
    if (!data || "error" in data) return [];
    return data;
  }, [data]);

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
      setSelectedRepos(new Set(repositories.map((r) => r.id)));
    } else {
      setSelectedRepos(new Set());
    }
  };

  const handleFinalize = () => {
    onComplete(Array.from(selectedRepos));
  };

  const allSelected = repositories.length > 0 && selectedRepos.size === repositories.length;

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
          Choose which repositories to apply this agent to. You can change this later.
        </p>
      </div>

      {/* Toggle all control */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
        <div>
          <p className="font-medium">
            {selectedRepos.size} of {repositories.length} repositories selected
          </p>
          <p className="text-sm text-muted-foreground">
            Enable or disable all repositories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {allSelected ? "All enabled" : "Enable all"}
          </span>
          <Switch
            checked={allSelected}
            onCheckedChange={handleToggleAll}
          />
        </div>
      </div>

      {/* Repositories list */}
      <div className="space-y-3">
        {repositories.map((repo) => (
          <Card key={repo.id}>
            <CardContent className="flex items-center gap-4 p-4">
              {/* Repository icon */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <GitBranch className="h-5 w-5 text-primary" />
              </div>

              {/* Repository info */}
              <div className="flex-1 space-y-1">
                <h4 className="font-medium">{repo.name}</h4>
                {repo.description && (
                  <p className="text-sm text-muted-foreground">
                    {repo.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {repo.private && (
                    <span className="rounded bg-muted px-1.5 py-0.5">
                      Private
                    </span>
                  )}
                  {repo.defaultBranch && (
                    <span>{repo.defaultBranch}</span>
                  )}
                </div>
              </div>

              {/* Toggle switch */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedRepos.has(repo.id) ? "Enabled" : "Disabled"}
                </span>
                <Switch
                  checked={selectedRepos.has(repo.id)}
                  onCheckedChange={() => handleToggle(repo.id)}
                  disabled={isSubmitting}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {repositories.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          No repositories available. Please connect your GitHub repositories first.
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between border-t pt-6">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
        >
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

