import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { advanceToLlmStep } from "@/actions/onboarding";
import { Bot } from "lucide-react";
import { AgentSelection } from "@/components/onboarding/agent-selection";
import { db } from "@/db";
import { agentTemplates } from "@/db/schema";
import { inArray } from "drizzle-orm";

// Template IDs to show during onboarding
const ONBOARDING_TEMPLATE_IDS = [
  "jw1x0dbesgp1pulnuw8sc0m8",
  "hlmn6nnadu80n4uyczqnt24i",
  "w6pp8h9r7ud0ma2hbxlgtwt6",
];

async function getOnboardingTemplates() {
  const templates = await db
    .select()
    .from(agentTemplates)
    .where(inArray(agentTemplates.id, ONBOARDING_TEMPLATE_IDS));

  // Sort by the order defined in ONBOARDING_TEMPLATE_IDS
  return templates.sort(
    (a, b) =>
      ONBOARDING_TEMPLATE_IDS.indexOf(a.id) -
      ONBOARDING_TEMPLATE_IDS.indexOf(b.id)
  );
}

export default async function AgentOnboardingPage() {
  const templates = await getOnboardingTemplates();

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4 mt-12">
        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center">
          <Bot className="w-16 h-16 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Create Your First Agent</h1>
        <p className="text-lg text-muted-foreground">
          Choose an agent template to get started with repository automation.
        </p>
      </div>

      {/* Main card with agent selection */}
      <Card className="mt-18">
        <CardContent>
          <AgentSelection templates={templates} />
        </CardContent>
      </Card>

      {/* Skip button */}
      <div className="flex justify-end">
        <form action={advanceToLlmStep}>
          <Button type="submit" variant="ghost">
            Skip this step
          </Button>
        </form>
      </div>
    </div>
  );
}
