import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Key } from "lucide-react";
import { OnboardingApiKeyForm } from "./api-key-form";
import { IconClaude } from "@workspace/ui/components/claude-icon";

export default function LLMOnboardingPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4 mt-12">
        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center">
          <IconClaude className="w-16 h-16 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Add Your Anthropic API Key</h1>
        <p className="text-lg text-muted-foreground">
          DevFleet uses Claude Code to power your automations. Add your API key
          to continue.
        </p>
      </div>

      {/* Main card */}
      <Card className="mt-18">
        <CardHeader>
          <CardTitle>Anthropic API Key</CardTitle>
          <CardDescription>
            Your API key is encrypted at rest and never exposed. Get your key
            from{" "}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Anthropic Console
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingApiKeyForm />
        </CardContent>
      </Card>
    </div>
  );
}
