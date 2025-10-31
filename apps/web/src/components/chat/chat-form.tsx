"use client";

import { useRef, useState, useEffect, useTransition } from "react";
import { ArrowUp, GitBranch, Container, Loader, Search } from "lucide-react";
import { useLocalStorage } from "@workspace/ui/hooks/use-local-storage";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@workspace/ui/components/select";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { EnvironmentWithRepository } from "@/db/schema";
import { BranchSelector } from "@/components/branch-selector";

interface Props {
  onSubmit: (
    msg: string,
    environment: EnvironmentWithRepository,
    branch: string
  ) => void | Promise<void>;
  showEnvironments?: boolean;
  environments?: EnvironmentWithRepository[];
  organization?: { id: string };
  isEnabled?: boolean;
}

export default function ChatForm({
  onSubmit,
  showEnvironments = false,
  environments = [],
  organization,
  isEnabled = true,
}: Props) {
  const isMobile = useIsMobile();
  const sortedEnvironments = [...environments].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const [lastId, setLastId] = useLocalStorage<string | null>(
    `devfleet-selected-environment-${organization?.id ?? "default"}`,
    null
  );

  const initialEnvironment =
    sortedEnvironments.find((env) => env.id === lastId) ??
    sortedEnvironments[0];

  const [message, setMessage] = useState("");
  const [selectedEnvironment, setEnvironment] = useState<
    EnvironmentWithRepository | undefined
  >(initialEnvironment);
  const [selectedBranch, setBranch] = useState<string | undefined>(
    initialEnvironment?.defaultBaseBranch ||
      initialEnvironment?.repository.defaultBranch
  );
  const [submitting, setSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update selected branch when environment changes
  useEffect(() => {
    if (selectedEnvironment) {
      setBranch(
        selectedEnvironment.defaultBaseBranch ||
          selectedEnvironment.repository.defaultBranch
      );
    } else {
      setBranch(undefined);
    }
  }, [selectedEnvironment]);

  const autoResize = () => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height =
      Math.min(textareaRef.current.scrollHeight, 160) + "px";
  };

  const handleSubmit = async () => {
    const text = message.trim();
    if (!text) return;

    setSubmitting(true);
    try {
      if (selectedEnvironment) setLastId(selectedEnvironment.id);

      startTransition(async () => {
        await onSubmit(text, selectedEnvironment!, selectedBranch!);
      });

      setMessage("");
    } finally {
      setSubmitting(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = "56px";
      }
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="rounded-lg border p-3 sm:p-4 flex flex-col gap-2 bg-background"
    >
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onInput={autoResize}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder="Ask DevFleet to build..."
        className="w-full resize-none focus:outline-none text-sm min-h-14 overflow-hidden"
        disabled={submitting || isPending || !isEnabled}
      />

      <div className="flex items-center justify-between gap-2">
        {showEnvironments && (
          <div className="flex items-center gap-2">
            <Select
              value={selectedEnvironment?.id ?? ""}
              onValueChange={(id) => {
                const environment = sortedEnvironments.find(
                  (env) => env.id === id
                );
                setEnvironment(environment);
              }}
              disabled={submitting || isPending || !isEnabled}
            >
              <SelectTrigger className="w-16 md:w-[200px] h-8">
                {isMobile ? (
                  <Container className="h-4 w-4" />
                ) : (
                  <SelectValue placeholder="Select an environment" />
                )}
              </SelectTrigger>

              <SelectContent>
                {sortedEnvironments.map((environment) => (
                  <SelectItem
                    key={environment.id}
                    value={environment.id}
                    className="flex items-center gap-2"
                  >
                    <Container className="h-4 w-4" /> {environment.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedEnvironment && (
              <BranchSelector
                selectedBranch={selectedBranch}
                onBranchChange={setBranch}
                repositoryFullName={selectedEnvironment.repository.fullName}
                organizationId={selectedEnvironment.organizationId}
                defaultBranch={selectedEnvironment.repository.defaultBranch}
                placeholder="Select branch"
                className="w-16 md:w-[150px] h-8"
                disabled={submitting || isPending || !isEnabled}
              />
            )}
          </div>
        )}

        <Button
          type="submit"
          disabled={submitting || isPending || !message.trim() || !isEnabled}
          size="icon"
          className="ml-auto sm:ml-auto self-end sm:self-auto size-8"
        >
          {submitting || isPending ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  );
}
