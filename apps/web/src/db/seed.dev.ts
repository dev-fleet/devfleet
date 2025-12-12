import { env } from "@/env.mjs";
import { db } from "./index";
import { agentTemplates } from "./schema";
import { createId } from "@paralleldrive/cuid2";

/**
 * Seed initial agent templates
 */
export async function seedAgentTemplates() {
  // TypeScript Agent Template
  const tsAgentId = createId();
  await db.insert(agentTemplates).values({
    id: tsAgentId,
    name: "TypeScript Agent",
    slug: "typescript",
    description:
      "Specialized agent for TypeScript code review. Checks for type safety, best practices, and common TypeScript pitfalls.",
    basePrompt: `You are a TypeScript code review expert. Analyze the provided code changes for TypeScript best practices. For each issue found, provide:
1. Clear description of the issue
2. Line number(s) where it occurs
3. Suggested fix or best practice
4. Severity level (critical, high, medium, low)

Focus areas:
- Type safety (implicit any, proper null/undefined checks, type guards)
- Error handling (proper try-catch, typed errors)
- Code quality (unused imports/variables, proper return types)
- Best practices (const vs let, optional chaining, nullish coalescing)
- Promise handling (proper await, .then/.catch)`,
    category: "language",
    icon: "typescript",
    isSystemTemplate: true,
    ownerGhOrganizationId: null,
  });

  // Security Agent Template
  const secAgentId = createId();
  await db.insert(agentTemplates).values({
    id: secAgentId,
    name: "Security Agent",
    slug: "security",
    description:
      "Specialized agent for security code review. Identifies potential security vulnerabilities and unsafe coding practices.",
    basePrompt: `You are a security code review expert. Analyze the provided code changes for security vulnerabilities. For each security issue found, provide:
1. Clear description of the vulnerability
2. Line number(s) where it occurs
3. Potential security impact
4. Recommended fix or mitigation
5. Severity level (critical, high, medium, low)

Focus areas:
- Hardcoded secrets (API keys, passwords, tokens)
- Injection vulnerabilities (SQL, XSS, command injection)
- Path traversal in file operations
- Weak cryptography (MD5, SHA1, weak keys)
- Authentication and authorization issues
- CORS misconfiguration
- Sensitive data exposure in logs/errors`,
    category: "security",
    icon: "shield",
    isSystemTemplate: true,
    ownerGhOrganizationId: null,
  });
}

const seed = async () => {
  if (env.NODE_ENV !== "development") {
    throw new Error("This script can only be used in development mode.");
  }

  await seedAgentTemplates();
};

seed()
  .then(() => {
    console.log("✨ Database Seeded successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Database Seeding failed.");
    console.error(error);
    process.exit(1);
  });
