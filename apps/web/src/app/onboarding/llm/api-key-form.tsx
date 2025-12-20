"use client";

import { useState, useCallback } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { saveApiKeyAndAdvanceOnboarding } from "@/actions/onboarding";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";

export function OnboardingApiKeyForm() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }

    setIsSaving(true);

    try {
      const result = await saveApiKeyAndAdvanceOnboarding(apiKey);

      if (result.success) {
        toast.success("API key saved successfully");
        router.push("/onboarding/agent");
      } else {
        toast.error(result.error || "Failed to save API key");
      }
    } catch {
      toast.error("Failed to save API key");
    } finally {
      setIsSaving(false);
    }
  }, [apiKey, router]);

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={showKey ? "text" : "password"}
            placeholder="sk-ant-api03-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="pr-10 font-mono text-sm"
            disabled={isSaving}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => setShowKey(!showKey)}
          >
            {showKey ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Security:</strong> Your API key is encrypted at rest using
          AES-256-GCM encryption. We never log or expose your full API key.
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={isSaving || !apiKey.trim()}
          className="min-w-32"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    </div>
  );
}
