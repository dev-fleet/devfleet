"use client";

import { useState, useCallback } from "react";
import { Loader2, Key, Trash2, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { useOrgSettings } from "@/hooks/useOrgSettings";
import {
  saveApiKey,
  deleteApiKey,
  testAnthropicApiKey,
} from "@/actions/llm-settings";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Badge } from "@workspace/ui/components/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group";

export function LLMSettings() {
  const { data, isLoading, error, mutate } = useOrgSettings();
  const [anthropicKey, setAnthropicKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [showKey, setShowKey] = useState(false);

  const existingAnthropicKey = data?.apiKeys.find(
    (key) => key.provider === "anthropic"
  );

  const handleTestKey = useCallback(async () => {
    if (!anthropicKey.trim()) {
      toast.error("Please enter an API key to test");
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testAnthropicApiKey(anthropicKey);
      setTestResult({
        success: result.success,
        message: result.success
          ? "API key is valid!"
          : result.error || "Invalid API key",
      });

      if (result.success) {
        toast.success("API key is valid!");
      } else {
        toast.error(result.error || "API key validation failed");
      }
    } catch {
      setTestResult({
        success: false,
        message: "Failed to test API key",
      });
      toast.error("Failed to test API key");
    } finally {
      setIsTesting(false);
    }
  }, [anthropicKey]);

  const handleSaveKey = useCallback(async () => {
    if (!anthropicKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }

    setIsSaving(true);

    try {
      const result = await saveApiKey("anthropic", anthropicKey);

      if (result.success) {
        toast.success("API key saved successfully");
        setAnthropicKey("");
        setTestResult(null);
        mutate();
      } else {
        toast.error(result.error || "Failed to save API key");
      }
    } catch {
      toast.error("Failed to save API key");
    } finally {
      setIsSaving(false);
    }
  }, [anthropicKey, mutate]);

  const handleDeleteKey = useCallback(async () => {
    setIsDeleting(true);

    try {
      const result = await deleteApiKey("anthropic");

      if (result.success) {
        toast.success("API key deleted successfully");
        mutate();
      } else {
        toast.error("Failed to delete API key");
      }
    } catch {
      toast.error("Failed to delete API key");
    } finally {
      setIsDeleting(false);
    }
  }, [mutate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
        <p className="text-sm text-destructive">
          Failed to load organization settings. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* LLM Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            LLM Configuration
          </CardTitle>
          <CardDescription>
            Configure how your organization uses LLM services for AI agents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Billing Mode Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Billing Mode</Label>
            <RadioGroup
              value={data.organization.llmBillingMode}
              className="space-y-3"
              disabled
            >
              <div className="flex items-start space-x-3 rounded-lg border p-4 opacity-50">
                <RadioGroupItem value="subscription" id="subscription" disabled />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="subscription"
                      className="font-medium cursor-not-allowed"
                    >
                      DevFleet Subscription
                    </Label>
                    <Badge variant="secondary" className="text-xs">
                      Coming Soon
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Let DevFleet handle API keys and billing. Simple monthly
                    pricing based on usage.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border border-primary p-4 bg-primary/5">
                <RadioGroupItem value="byok" id="byok" checked />
                <div className="space-y-1">
                  <Label htmlFor="byok" className="font-medium">
                    Bring Your Own Key (BYOK)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Use your own API keys. You manage billing directly with the
                    LLM providers.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Anthropic API Key Section */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Anthropic API Key</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Required for running AI agents. Get your key from{" "}
                  <a
                    href="https://console.anthropic.com/settings/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Anthropic Console
                  </a>
                </p>
              </div>
              {existingAnthropicKey && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Configured
                </Badge>
              )}
            </div>

            {existingAnthropicKey ? (
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-mono">{existingAnthropicKey.keyPrefix}</p>
                  <p className="text-xs text-muted-foreground">
                    Added{" "}
                    {new Date(existingAnthropicKey.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove the Anthropic API key from your
                        organization. Your AI agents will not be able to run
                        until you add a new key.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteKey}
                        className="bg-destructive text-white hover:bg-destructive/90"
                      >
                        Delete Key
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    type={showKey ? "text" : "password"}
                    placeholder="sk-ant-api03-..."
                    value={anthropicKey}
                    onChange={(e) => {
                      setAnthropicKey(e.target.value);
                      setTestResult(null);
                    }}
                    className="pr-10 font-mono text-sm"
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

                {testResult && (
                  <div
                    className={`flex items-center gap-2 text-sm ${
                      testResult.success
                        ? "text-green-600"
                        : "text-destructive"
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    {testResult.message}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleTestKey}
                    disabled={isTesting || !anthropicKey.trim()}
                  >
                    {isTesting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Test Key
                  </Button>
                  <Button
                    onClick={handleSaveKey}
                    disabled={isSaving || !anthropicKey.trim()}
                  >
                    {isSaving && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Key
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="rounded-lg border bg-muted/50 p-4 mt-4">
            <p className="text-sm text-muted-foreground">
              <strong>Security:</strong> Your API keys are encrypted at rest
              using AES-256-GCM encryption. We never log or expose your full API
              keys.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

