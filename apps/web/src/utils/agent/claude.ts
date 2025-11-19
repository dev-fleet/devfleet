import { escapePrompt } from "./helpers";
import { db } from "@/db";
import { agents, agentTemplates, rules, agentRules } from "@/db/schema";
import { and, eq } from "drizzle-orm";

const SYSTEM_PROMPT = "Don't ask any follow up questions.";

/**
 * Build the complete prompt for an agent by combining the base prompt
 * from the agent template with all enabled rules
 */
export async function buildAgentPrompt(agentId: string): Promise<string> {
  // Get the agent
  const agent = await db
    .select({
      id: agents.id,
      agentTemplateId: agents.agentTemplateId,
      prompt: agents.prompt,
    })
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  if (!agent[0]) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  // Get the agent template
  const agentTemplate = await db
    .select({
      basePrompt: agentTemplates.basePrompt,
    })
    .from(agentTemplates)
    .where(eq(agentTemplates.id, agent[0].agentTemplateId))
    .limit(1);

  if (!agentTemplate[0]) {
    throw new Error(`Agent template not found for agent: ${agentId}`);
  }

  // Use custom prompt override if provided, otherwise use base prompt
  const basePrompt = agent[0].prompt ?? agentTemplate[0].basePrompt;

  // Get all enabled rules for this agent
  const enabledRules = await db
    .select({
      name: rules.name,
      description: rules.description,
      severity: rules.severity,
      order: rules.order,
    })
    .from(agentRules)
    .innerJoin(rules, eq(agentRules.ruleId, rules.id))
    .where(and(eq(agentRules.agentId, agentId), eq(agentRules.enabled, true)))
    .orderBy(rules.order);

  // If no rules are enabled, just return the base prompt
  if (enabledRules.length === 0) {
    return basePrompt;
  }

  // Build the rules section
  const rulesSection = enabledRules
    .map(
      (rule, idx) =>
        `${idx + 1}. **${rule.name}** (${rule.severity})\n   ${rule.description}`
    )
    .join("\n\n");

  // Combine base prompt with rules
  const fullPrompt = `${basePrompt}\n\n## Enabled Rules\n\n${rulesSection}`;

  return fullPrompt;
}

export function promptClaude(
  prompt: string,
  model: string = "claude-sonnet-4-5-20250929"
) {
  const escapedPrompt = escapePrompt(prompt);

  // Override the command config with history-aware instruction
  const command = `echo "${escapedPrompt}" | claude \
    -p \
    --append-system-prompt "${SYSTEM_PROMPT}" \
    --output-format stream-json \
    --verbose \
    --allowedTools "Read,Bash(gh pr view)" \
    --model ${model}`;

  return command;
}
