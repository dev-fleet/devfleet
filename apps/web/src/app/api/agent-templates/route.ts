import { NextResponse } from "next/server";
import { db } from "@/db";
import { agentTemplates } from "@/db/schema";

export type GetAgentTemplatesResponse = Awaited<ReturnType<typeof getData>>;

export async function GET() {
  const result = await getData();
  return NextResponse.json(result);
}

async function getData() {
  // Get all agent templates
  const templates = await db
    .select()
    .from(agentTemplates)
    .orderBy(agentTemplates.name);

  return { agentTemplates: templates };
}
