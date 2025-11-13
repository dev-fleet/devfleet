import { env } from "@/env.mjs";
import { db } from "./index";
import { agentTypes, agentTypeRules } from "./schema";
import { createId } from "@paralleldrive/cuid2";

/**
 * Seed initial agent types and their rules
 */
export async function seedAgentTypes() {
  console.log("Seeding agent types and rules...");

  // TypeScript Agent
  const tsAgentId = createId();
  await db.insert(agentTypes).values({
    id: tsAgentId,
    name: "TypeScript Agent",
    slug: "typescript",
    description:
      "Specialized agent for TypeScript code review. Checks for type safety, best practices, and common TypeScript pitfalls.",
    basePrompt: `You are a TypeScript code review expert. Analyze the provided code changes and check for the enabled rules below. For each issue found, provide:
1. Clear description of the issue
2. Line number(s) where it occurs
3. Suggested fix or best practice
4. Severity level

Focus only on the enabled rules and provide actionable feedback.`,
    category: "language",
    icon: "typescript",
  });

  const tsRules = [
    {
      name: "No Implicit Any",
      description:
        "Check for implicit 'any' types. All variables, parameters, and return types should have explicit types.",
      severity: "high" as const,
      category: "type-safety",
      defaultEnabled: true,
      order: 1,
    },
    {
      name: "Proper Error Handling",
      description:
        "Ensure try-catch blocks are used appropriately and errors are properly typed and handled.",
      severity: "high" as const,
      category: "error-handling",
      defaultEnabled: true,
      order: 2,
    },
    {
      name: "Unused Imports",
      description:
        "Identify and flag unused imports that should be removed for cleaner code.",
      severity: "low" as const,
      category: "code-quality",
      defaultEnabled: true,
      order: 3,
    },
    {
      name: "Unused Variables",
      description:
        "Check for declared variables that are never used in the code.",
      severity: "medium" as const,
      category: "code-quality",
      defaultEnabled: true,
      order: 4,
    },
    {
      name: "Type Assertions Review",
      description:
        "Review 'as' type assertions and 'any' casts for potential type safety issues.",
      severity: "medium" as const,
      category: "type-safety",
      defaultEnabled: true,
      order: 5,
    },
    {
      name: "Promise Handling",
      description:
        "Ensure Promises are properly awaited or handled with .then/.catch.",
      severity: "high" as const,
      category: "async",
      defaultEnabled: true,
      order: 6,
    },
    {
      name: "Null/Undefined Checks",
      description:
        "Verify proper null and undefined checks before accessing properties or calling methods.",
      severity: "high" as const,
      category: "type-safety",
      defaultEnabled: true,
      order: 7,
    },
    {
      name: "Array Method Returns",
      description:
        "Check if array methods like map, filter, reduce have proper return statements.",
      severity: "medium" as const,
      category: "code-quality",
      defaultEnabled: true,
      order: 8,
    },
    {
      name: "Function Return Types",
      description:
        "Ensure all functions have explicit return types for better type safety.",
      severity: "medium" as const,
      category: "type-safety",
      defaultEnabled: false,
      order: 9,
    },
    {
      name: "Strict Equality",
      description:
        "Prefer === and !== over == and != for type-safe comparisons.",
      severity: "medium" as const,
      category: "best-practices",
      defaultEnabled: true,
      order: 10,
    },
    {
      name: "Const vs Let",
      description:
        "Use const for variables that are not reassigned, prefer const over let.",
      severity: "low" as const,
      category: "best-practices",
      defaultEnabled: false,
      order: 11,
    },
    {
      name: "Optional Chaining",
      description:
        "Suggest using optional chaining (?.) where appropriate for safer property access.",
      severity: "low" as const,
      category: "best-practices",
      defaultEnabled: false,
      order: 12,
    },
    {
      name: "Nullish Coalescing",
      description:
        "Recommend nullish coalescing (??) over logical OR (||) for default values.",
      severity: "low" as const,
      category: "best-practices",
      defaultEnabled: false,
      order: 13,
    },
    {
      name: "Type Guards",
      description:
        "Check for proper type narrowing and type guard usage in conditional blocks.",
      severity: "medium" as const,
      category: "type-safety",
      defaultEnabled: true,
      order: 14,
    },
    {
      name: "Enum Usage",
      description:
        "Review enum usage and suggest const enums or union types where appropriate.",
      severity: "low" as const,
      category: "best-practices",
      defaultEnabled: false,
      order: 15,
    },
  ];

  for (const rule of tsRules) {
    await db.insert(agentTypeRules).values({
      id: createId(),
      agentTypeId: tsAgentId,
      ...rule,
    });
  }

  // Security Agent
  const secAgentId = createId();
  await db.insert(agentTypes).values({
    id: secAgentId,
    name: "Security Agent",
    slug: "security",
    description:
      "Specialized agent for security code review. Identifies potential security vulnerabilities and unsafe coding practices.",
    basePrompt: `You are a security code review expert. Analyze the provided code changes for security vulnerabilities based on the enabled rules below. For each security issue found, provide:
1. Clear description of the vulnerability
2. Line number(s) where it occurs
3. Potential security impact
4. Recommended fix or mitigation
5. Severity level (critical, high, medium, low)

Focus on real security issues, not theoretical ones. Be specific and actionable.`,
    category: "security",
    icon: "shield",
  });

  const secRules = [
    {
      name: "Hardcoded Secrets",
      description:
        "Detect hardcoded API keys, passwords, tokens, or other sensitive credentials in the code.",
      severity: "critical" as const,
      category: "secrets",
      defaultEnabled: true,
      order: 1,
    },
    {
      name: "SQL Injection",
      description:
        "Check for SQL injection vulnerabilities in database queries (string concatenation, unsafe interpolation).",
      severity: "critical" as const,
      category: "injection",
      defaultEnabled: true,
      order: 2,
    },
    {
      name: "XSS Vulnerabilities",
      description:
        "Identify potential Cross-Site Scripting (XSS) vulnerabilities in user input handling and rendering.",
      severity: "high" as const,
      category: "injection",
      defaultEnabled: true,
      order: 3,
    },
    {
      name: "Command Injection",
      description:
        "Detect unsafe command execution with user input (exec, eval, system calls).",
      severity: "critical" as const,
      category: "injection",
      defaultEnabled: true,
      order: 4,
    },
    {
      name: "Path Traversal",
      description:
        "Check for path traversal vulnerabilities in file operations.",
      severity: "high" as const,
      category: "file-system",
      defaultEnabled: true,
      order: 5,
    },
    {
      name: "Insecure Dependencies",
      description:
        "Flag usage of known vulnerable npm packages or outdated dependencies.",
      severity: "high" as const,
      category: "dependencies",
      defaultEnabled: true,
      order: 6,
    },
    {
      name: "Weak Cryptography",
      description:
        "Identify weak or deprecated cryptographic algorithms (MD5, SHA1, weak keys).",
      severity: "high" as const,
      category: "cryptography",
      defaultEnabled: true,
      order: 7,
    },
    {
      name: "Authentication Issues",
      description:
        "Check for authentication bypass, weak password policies, or insecure session management.",
      severity: "critical" as const,
      category: "authentication",
      defaultEnabled: true,
      order: 8,
    },
    {
      name: "Authorization Checks",
      description:
        "Ensure proper authorization checks are in place for sensitive operations.",
      severity: "critical" as const,
      category: "authorization",
      defaultEnabled: true,
      order: 9,
    },
    {
      name: "Unsafe Regex",
      description:
        "Detect regular expressions vulnerable to ReDoS (Regular Expression Denial of Service).",
      severity: "medium" as const,
      category: "regex",
      defaultEnabled: true,
      order: 10,
    },
    {
      name: "CORS Misconfiguration",
      description:
        "Check for overly permissive CORS configurations that could expose the API.",
      severity: "medium" as const,
      category: "configuration",
      defaultEnabled: true,
      order: 11,
    },
    {
      name: "Sensitive Data Exposure",
      description:
        "Identify logging or error messages that might expose sensitive information.",
      severity: "medium" as const,
      category: "data-exposure",
      defaultEnabled: true,
      order: 12,
    },
  ];

  for (const rule of secRules) {
    await db.insert(agentTypeRules).values({
      id: createId(),
      agentTypeId: secAgentId,
      ...rule,
    });
  }

  console.log("✅ Agent types and rules seeded successfully!");
}

const seed = async () => {
  if (env.NODE_ENV !== "development") {
    throw new Error("This script can only be used in development mode.");
  }

  await seedAgentTypes();
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
