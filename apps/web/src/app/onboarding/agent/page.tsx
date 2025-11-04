import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { CheckCircle2 } from "lucide-react";
import { IconGithubLogo } from "@workspace/ui/components/github-logo";
import { Button } from "@workspace/ui/components/button";
import { completeOnboarding } from "@/actions/onboarding";

export default function AgentOnboardingPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4 mt-12">
        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center">
          <IconGithubLogo className="w-16 h-16 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Connect Your GitHub Repositories</h1>
        <p className="text-lg text-muted-foreground">
          Connect your GitHub repositories and start building with DevFleet.
        </p>
      </div>

      {/* Main card */}
      <Card className="mt-18">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            GitHub Integration
          </CardTitle>
          <CardDescription>
            We&rsquo;ll need access to your GitHub repositories to help you with
            your development workflow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Benefits list */}
          <div className="space-y-4">
            <h3 className="font-medium">Why we need this:</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <span className="flex items-center justify-center min-w-4 min-h-4">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </span>
                We request access to your repositories so we can securely clone
                your code and run development agents on your behalf.
              </li>
              <li className="flex items-center gap-2 text-sm">
                <span className="flex items-center justify-center min-w-4 min-h-4">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </span>
                After the agents complete their tasks, we need permission to
                create pull requests with their changes.
              </li>
            </ul>
          </div>
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
