"use client";

import { Card, CardContent } from "@workspace/ui/components/card";
import { Bot } from "lucide-react";
import { AgentSettingsForm } from "@/app/(dashboard)/settings/agent-settings-form";
import { useUser } from "@/lib/swr/user";
import { useRouter } from "next/navigation";

export default function AgentOnboardingPage() {
  const { user } = useUser();
  const router = useRouter();

  const handleAgentConfigured = () => {
    router.push("/dashboard");
  };

  if (!user?.activeOrganization) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
          <Bot className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Configure Your AI Agent</h1>
        <p className="text-lg text-muted-foreground">
          Choose and configure your AI agent to assist with development tasks.
        </p>
      </div>

      {/* Main card */}
      <Card>
        <CardContent className="space-y-6">
          {/* Agent Settings Form */}
          <AgentSettingsForm
            userId={user.id}
            organizationId={user.activeOrganization.id}
            organizationName={
              user.activeOrganization.name ||
              user.activeOrganization.login ||
              "Organization"
            }
            mode="onboarding"
            onSuccess={handleAgentConfigured}
          />
        </CardContent>
      </Card>
    </div>
  );
}
