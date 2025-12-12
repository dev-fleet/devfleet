import * as z from "zod";
import { SEVERITIES } from "@/db/schema";

// Types for Claude CLI output parsing
// The CLI extends the SDK's Usage type with additional cache_creation details
export const ClaudeResultUsageSchema = z.object({
  input_tokens: z.number(),
  output_tokens: z.number(),
  cache_creation_input_tokens: z.number().optional(),
  cache_read_input_tokens: z.number().optional(),
  cache_creation: z
    .object({
      ephemeral_1h_input_tokens: z.number(),
      ephemeral_5m_input_tokens: z.number(),
    })
    .optional(),
});
export type ClaudeResultUsage = z.infer<typeof ClaudeResultUsageSchema>;

// CLI-specific per-model usage breakdown
export const ClaudeModelUsageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheReadInputTokens: z.number(),
  cacheCreationInputTokens: z.number(),
  webSearchRequests: z.number(),
  costUSD: z.number(),
  contextWindow: z.number(),
});
export type ClaudeModelUsage = z.infer<typeof ClaudeModelUsageSchema>;

export const AgentStructuredOutputSchema = z.object({
  findings: z.array(
    z.object({
      file: z.string(),
      line: z.number().min(0),
      severity: z.enum(SEVERITIES),
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
export type AgentStructuredOutput = z.infer<typeof AgentStructuredOutputSchema>;

export const AgentStructuredOutputJsonSchema = z.toJSONSchema(
  AgentStructuredOutputSchema,
  { target: "draft-7" }
);

// CLI-specific result type - this is not an SDK type, it's output from the Claude CLI
export const ClaudeResultSchema = z.object({
  type: z.literal("result"),
  subtype: z.enum(["success", "error"]),
  is_error: z.boolean(),
  duration_ms: z.number(),
  duration_api_ms: z.number(),
  num_turns: z.number(),
  result: z.string(),
  session_id: z.string(),
  total_cost_usd: z.number(),
  usage: ClaudeResultUsageSchema,
  modelUsage: z.record(z.string(), ClaudeModelUsageSchema),
  permission_denials: z.array(z.string()),
  structured_output: AgentStructuredOutputSchema.nullable(),
  uuid: z.string(),
});
export type ClaudeResult = z.infer<typeof ClaudeResultSchema>;
