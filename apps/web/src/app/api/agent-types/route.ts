import { NextResponse } from "next/server";
import { db } from "@/db";
import { agentTypes, agentTypeRules } from "@/db/schema";
import { eq } from "drizzle-orm";

export type GetAgentTypesResponse = Awaited<ReturnType<typeof getData>>;

export async function GET() {
  const result = await getData();
  return NextResponse.json(result);
}

async function getData() {
  // Get all agent types with their rules
  const types = await db.select().from(agentTypes).orderBy(agentTypes.name);

  const typesWithRules = await Promise.all(
    types.map(async (type) => {
      const rules = await db
        .select()
        .from(agentTypeRules)
        .where(eq(agentTypeRules.agentTypeId, type.id))
        .orderBy(agentTypeRules.order);

      return {
        ...type,
        rules,
        ruleCount: rules.length,
        defaultEnabledCount: rules.filter((r) => r.defaultEnabled).length,
      };
    })
  );

  return { agentTypes: typesWithRules };
}

