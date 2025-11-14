import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { completeOnboarding } from "@/actions/onboarding";
import { Bot } from "lucide-react";

export default function AgentOnboardingPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4 mt-12">
        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center">
          <Bot className="w-16 h-16 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Create Your First Agent</h1>
        <p className="text-lg text-muted-foreground">
          Use our agent templates to create your first agent.
        </p>
      </div>

      {/* Main card */}
      <Card className="mt-18">
        <CardContent className="space-y-6">
          {/* Benefits list */}
          <div className="space-y-4">Coming Soon...</div>
        </CardContent>
      </Card>

      {/* Skip button */}
      <div className="flex justify-end">
        <form action={completeOnboarding}>
          <Button type="submit" variant="ghost">
            Skip this step
          </Button>
        </form>
      </div>
    </div>
  );
}
