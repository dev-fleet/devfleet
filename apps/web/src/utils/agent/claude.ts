import { escapePrompt } from "./helpers";

const SYSTEM_PROMPT = "Don't ask any follow up questions.";

export function promptClaude(
  prompt: string,
  model: string = "claude-sonnet-4-20250514"
) {
  const escapedPrompt = escapePrompt(prompt);

  // Override the command config with history-aware instruction
  const command = `echo "${escapedPrompt}" | claude \
    -p \
    --append-system-prompt "${SYSTEM_PROMPT}" \
    --output-format stream-json \
    --verbose \
    --allowedTools "Edit,Write,MultiEdit,Read,Bash" \
    --model ${model || "claude-sonnet-4-20250514"}`;
}
