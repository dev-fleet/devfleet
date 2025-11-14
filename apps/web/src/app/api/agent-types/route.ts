import { NextResponse } from "next/server";
import { db } from "@/db";
import { agentTemplates, rules } from "@/db/schema";
import { eq } from "drizzle-orm";

export type GetAgentTemplatesResponse = Awaited<ReturnType<typeof getData>>;

export async function GET() {
  const result = await getData();
  return NextResponse.json(result);
}

async function getData() {
  // Get all agent templates with their rules
  const templates = await db
    .select()
    .from(agentTemplates)
    .orderBy(agentTemplates.name);

  const templatesWithRules = await Promise.all(
    templates.map(async (template) => {
      const templateRules = await db
        .select()
        .from(rules)
        .where(eq(rules.agentTemplateId, template.id))
        .orderBy(rules.order);

      return {
        ...template,
        rules: templateRules,
        ruleCount: templateRules.length,
        defaultEnabledCount: templateRules.filter((r) => r.defaultEnabled)
          .length,
      };
    })
  );

  return { agentTemplates: templatesWithRules };
}
