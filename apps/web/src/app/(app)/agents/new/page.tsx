"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { InsetHeader } from "@/components/sidebar/inset-header";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { createAgent } from "@/actions/agents";

export default function NewAgentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [engine, setEngine] = useState<"anthropic" | "openai">("anthropic");
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onCreate = useCallback(async () => {
    if (!name.trim() || !prompt.trim()) return;
    try {
      setSubmitting(true);
      await createAgent({
        name: name.trim(),
        prompt: prompt.trim(),
        engine,
        languageFilter: null,
      });
      router.push("/agents");
    } finally {
      setSubmitting(false);
    }
  }, [name, prompt, engine, router]);

  return (
    <>
      <InsetHeader title="New agent">
        <Button
          onClick={onCreate}
          disabled={submitting || !name.trim() || !prompt.trim()}
        >
          {submitting ? "Creating..." : "Create"}
        </Button>
      </InsetHeader>
      <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6 sm:space-y-8">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">LLM</label>
            <Select
              value={engine}
              onValueChange={(v) => setEngine(v as "anthropic" | "openai")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select LLM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Prompt</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={12}
              placeholder="System prompt for this agent"
            />
          </div>
        </div>
      </div>
    </>
  );
}
