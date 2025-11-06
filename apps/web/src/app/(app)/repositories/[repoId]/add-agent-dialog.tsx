"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Plus } from "lucide-react";
import { addAgentToRepository } from "@/actions/repositories";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Badge } from "@workspace/ui/components/badge";

type OrgAgent = {
  id: string;
  name: string;
  description: string | null;
  engine: "anthropic" | "openai";
};

export function AddAgentDialog({
  repoId,
  orgAgents,
  currentAgentIds,
}: {
  repoId: string;
  orgAgents: OrgAgent[];
  currentAgentIds: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Filter out agents that are already added to this repo
  const availableAgents = orgAgents.filter(
    (agent) => !currentAgentIds.includes(agent.id)
  );

  const handleAddAgent = async () => {
    if (!selectedAgentId) {
      toast.error("Please select an agent");
      return;
    }

    setIsLoading(true);
    try {
      await addAgentToRepository(repoId, selectedAgentId);
      toast.success("Agent added successfully");
      setOpen(false);
      setSelectedAgentId("");
      router.refresh();
    } catch (error) {
      toast.error("Failed to add agent");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Agent
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Agent to Repository</DialogTitle>
          <DialogDescription>
            Select an agent to add to this repository. The agent will run on all
            future pull requests.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {availableAgents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-2">No agents available</p>
              <p className="text-sm">
                All your organization's agents are already added to this
                repository.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Agent</label>
                <Select
                  value={selectedAgentId}
                  onValueChange={setSelectedAgentId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAgents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center gap-2">
                          <span>{agent.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {agent.engine}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAgentId && (
                <div className="rounded-lg border p-4 bg-muted/50">
                  {(() => {
                    const agent = availableAgents.find(
                      (a) => a.id === selectedAgentId
                    );
                    return (
                      agent && (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">{agent.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {agent.engine}
                            </Badge>
                          </div>
                          {agent.description && (
                            <p className="text-sm text-muted-foreground">
                              {agent.description}
                            </p>
                          )}
                        </>
                      )
                    );
                  })()}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAddAgent}
            disabled={
              !selectedAgentId || isLoading || availableAgents.length === 0
            }
          >
            {isLoading ? "Adding..." : "Add Agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
