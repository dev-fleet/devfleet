import { escapePrompt } from "@/utils/agent/helpers";

const SYSTEM_PROMPT = "Don't ask any follow up questions.";

export function promptClaude(
  prompt: string,
  jsonSchema: string,
  model: string = "claude-sonnet-4-5-20250929"
) {
  // Escape the prompt and json schema
  const escapedPrompt = escapePrompt(prompt);
  const escapedJsonSchema = escapePrompt(jsonSchema);

  // Override the command config with history-aware instruction
  const command = `echo "${escapedPrompt}" | claude \
    -p \
    --append-system-prompt "${SYSTEM_PROMPT}" \
    --output-format json \
    --verbose \
    --json-schema "${escapedJsonSchema}" \
    --allowedTools "Bash(git diff:*),Bash(git status:*),Bash(git log:*),Bash(git show:*),Bash(git remote show:*),Read,Glob,Grep,LS,Task" \
    --model ${model}`;

  console.log("Command:", command);
  return command;
}

export const buildPrompt = (agentPrompt: string, rules: string) =>
  `
You are a senior engineer conducting a focused review of the changes on this branch.

GIT STATUS:

\`\`\`
!\`git status\`
\`\`\`

FILES MODIFIED:

\`\`\`
!\`git diff --name-only origin/HEAD...\`
\`\`\`

COMMITS:

\`\`\`
!\`git log --no-decorate origin/HEAD...\`
\`\`\`

DIFF CONTENT:

\`\`\`
!\`git diff --merge-base origin/HEAD\`
\`\`\`

Review the complete diff above. This contains all code changes in the PR.

{{AGENT_PROMPT}}

{{RULES}}

REQUIRED OUTPUT FORMAT:

You MUST output your findings as structured JSON with this exact schema:

{
  "findings": [
    {
      "file": "path/to/file.py",
      "line": 42,
      "severity": "HIGH",
      "description": "User input passed to SQL query without parameterization",
      "recommendation": "Replace string formatting with parameterized queries using SQLAlchemy or equivalent",
      "confidence": 0.95
    }
  ],
  "analysis_summary": {
    "files_reviewed": 8,
    "critical_severity": 0,
    "high_severity": 1,
    "medium_severity": 0,
    "low_severity": 0,
    "review_completed": true,
  }
}

SEVERITY GUIDELINES:
- **CRITICAL**: Issues that can break the system or user trust. Examples: code that corrupts data, exposes private information, blocks authentication, or makes the system unusable.
- **HIGH**: Issues that cause clear, direct problems in common situations. Examples: logic errors, unsafe patterns, or mistakes that can lead to data loss, crashes, or major malfunctions.
- **MEDIUM**: Issues that only surface under certain conditions but still matter. Examples: edge-case failures, unclear logic, inconsistent patterns, or design choices that make future changes harder.
- **LOW**: Minor issues that improve polish or long-term quality. Examples: small style inconsistencies, minor optimizations, or “defense-in-depth” improvements that reduce future risk.

CONFIDENCE SCORING:
- 0.9-1.0: The issue is clear, reproducible, and well-supported by evidence. You can point to the exact cause and show a reliable way to trigger it.
- 0.8-0.9: The pattern matches a known problem. It’s not fully proven, but the reasoning is solid and similar issues have well-understood fixes. 
- 0.7-0.8: The code looks questionable and could fail under the right conditions, but you don’t have enough evidence to be fully confident.
- Below 0.7: Don't report (too speculative)

FINAL REMINDER:
Focus on HIGH and MEDIUM findings only. Better to miss some theoretical issues than flood the report with false positives. Each finding should be something an engineer would confidently raise in a PR review.

Begin your analysis now. Use the repository exploration tools to understand the codebase context, then analyze the PR changes.

Your final reply must contain the JSON and nothing else. You should not reply again after outputting the JSON.
`
    .replace("{{AGENT_PROMPT}}", agentPrompt)
    .replace("{{RULES}}", rules);
