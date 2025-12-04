import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { RULE_SEVERITIES } from "@/db/schema";

const AgentStructuredOutputSchema = z.object({
  findings: z.array(
    z.object({
      file: z.string(),
      line: z.number().min(0),
      severity: z.enum(RULE_SEVERITIES),
      description: z.string(),
      recommendation: z.string(),
      confidence: z.number().min(0).max(1),
    })
  ),
  analysis_summary: z.object({
    files_reviewed: z.number(),
    critical_severity: z.number(),
    high_severity: z.number(),
    medium_severity: z.number(),
    low_severity: z.number(),
    review_completed: z.boolean(),
  }),
});

export const AgentStructuredOutputJsonSchema = zodToJsonSchema(
  AgentStructuredOutputSchema,
  "AgentStructuredOutput"
);

export type AgentStructuredOutput = z.infer<typeof AgentStructuredOutputSchema>;
