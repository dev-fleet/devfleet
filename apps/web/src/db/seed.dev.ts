import { env } from "@/env.mjs";
import { db } from "./index";
import { agentTemplates, rules } from "./schema";
import { createId } from "@paralleldrive/cuid2";

/**
 * Seed initial agent templates and their rules
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
    basePrompt: `You are a TypeScript code review expert. Analyze the provided code changes and check for the enabled rules below. For each issue found, provide:
1. Clear description of the issue
2. Line number(s) where it occurs
3. Suggested fix or best practice
4. Severity level (critical, high, medium, low)

Focus only on the rules listed below and provide actionable feedback.`,
    category: "language",
    icon: "typescript",
    isSystemTemplate: true,
    ownerGhOrganizationId: null,
  });

  const tsRules = [
    {
      name: "No Implicit Any",
      instructions:
        "Check for implicit 'any' types. All variables, parameters, and return types should have explicit types.",
      severity: "HIGH" as const,
      category: "type-safety",
      defaultEnabled: true,
      order: 1,
    },
    {
      name: "Proper Error Handling",
      instructions:
        "Ensure try-catch blocks are used appropriately and errors are properly typed and handled.",
      severity: "HIGH" as const,
      category: "error-handling",
      defaultEnabled: true,
      order: 2,
    },
    {
      name: "Unused Imports",
      instructions:
        "Identify and flag unused imports that should be removed for cleaner code.",
      severity: "LOW" as const,
      category: "code-quality",
      defaultEnabled: true,
      order: 3,
    },
    {
      name: "Unused Variables",
      instructions:
        "Check for declared variables that are never used in the code.",
      severity: "MEDIUM" as const,
      category: "code-quality",
      defaultEnabled: true,
      order: 4,
    },
    {
      name: "Type Assertions Review",
      instructions:
        "Review 'as' type assertions and 'any' casts for potential type safety issues.",
      severity: "MEDIUM" as const,
      category: "type-safety",
      defaultEnabled: true,
      order: 5,
    },
    {
      name: "Promise Handling",
      instructions:
        "Ensure Promises are properly awaited or handled with .then/.catch.",
      severity: "HIGH" as const,
      category: "async",
      defaultEnabled: true,
      order: 6,
    },
    {
      name: "Null/Undefined Checks",
      instructions:
        "Verify proper null and undefined checks before accessing properties or calling methods.",
      severity: "HIGH" as const,
      category: "type-safety",
      defaultEnabled: true,
      order: 7,
    },
    {
      name: "Array Method Returns",
      instructions:
        "Check if array methods like map, filter, reduce have proper return statements.",
      severity: "MEDIUM" as const,
      category: "code-quality",
      defaultEnabled: true,
      order: 8,
    },
    {
      name: "Function Return Types",
      instructions:
        "Ensure all functions have explicit return types for better type safety.",
      severity: "MEDIUM" as const,
      category: "type-safety",
      defaultEnabled: false,
      order: 9,
    },
    {
      name: "Strict Equality",
      instructions:
        "Prefer === and !== over == and != for type-safe comparisons.",
      severity: "MEDIUM" as const,
      category: "best-practices",
      defaultEnabled: true,
      order: 10,
    },
    {
      name: "Const vs Let",
      instructions:
        "Use const for variables that are not reassigned, prefer const over let.",
      severity: "LOW" as const,
      category: "best-practices",
      defaultEnabled: false,
      order: 11,
    },
    {
      name: "Optional Chaining",
      instructions:
        "Suggest using optional chaining (?.) where appropriate for safer property access.",
      severity: "LOW" as const,
      category: "best-practices",
      defaultEnabled: false,
      order: 12,
    },
    {
      name: "Nullish Coalescing",
      instructions:
        "Recommend nullish coalescing (??) over logical OR (||) for default values.",
      severity: "LOW" as const,
      category: "best-practices",
      defaultEnabled: false,
      order: 13,
    },
    {
      name: "Type Guards",
      instructions:
        "Check for proper type narrowing and type guard usage in conditional blocks.",
      severity: "MEDIUM" as const,
      category: "type-safety",
      defaultEnabled: true,
      order: 14,
    },
    {
      name: "Enum Usage",
      instructions:
        "Review enum usage and suggest const enums or union types where appropriate.",
      severity: "LOW" as const,
      category: "best-practices",
      defaultEnabled: false,
      order: 15,
    },
  ];

  for (const rule of tsRules) {
    await db.insert(rules).values({
      id: createId(),
      agentTemplateId: tsAgentId,
      ownerGhOrganizationId: null, // System rules
      ...rule,
    });
  }

  // Security Agent Template
  const secAgentId = createId();
  await db.insert(agentTemplates).values({
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

Focus on the rules listed below and provide actionable feedback.`,
    category: "security",
    icon: "shield",
    isSystemTemplate: true,
    ownerGhOrganizationId: null,
  });

  const secRules = [
    {
      name: "Hardcoded Secrets",
      instructions:
        "Detect hardcoded API keys, passwords, tokens, or other sensitive credentials in the code.",
      severity: "CRITICAL" as const,
      category: "secrets",
      defaultEnabled: true,
      order: 1,
    },
    {
      name: "SQL Injection",
      instructions:
        "Check for SQL injection vulnerabilities in database queries (string concatenation, unsafe interpolation).",
      severity: "CRITICAL" as const,
      category: "injection",
      defaultEnabled: true,
      order: 2,
    },
    {
      name: "XSS Vulnerabilities",
      instructions:
        "Identify potential Cross-Site Scripting (XSS) vulnerabilities in user input handling and rendering.",
      severity: "HIGH" as const,
      category: "injection",
      defaultEnabled: true,
      order: 3,
    },
    {
      name: "Command Injection",
      instructions:
        "Detect unsafe command execution with user input (exec, eval, system calls).",
      severity: "CRITICAL" as const,
      category: "injection",
      defaultEnabled: true,
      order: 4,
    },
    {
      name: "Path Traversal",
      instructions:
        "Check for path traversal vulnerabilities in file operations.",
      severity: "HIGH" as const,
      category: "file-system",
      defaultEnabled: true,
      order: 5,
    },
    {
      name: "Insecure Dependencies",
      instructions:
        "Flag usage of known vulnerable npm packages or outdated dependencies.",
      severity: "HIGH" as const,
      category: "dependencies",
      defaultEnabled: true,
      order: 6,
    },
    {
      name: "Weak Cryptography",
      instructions:
        "Identify weak or deprecated cryptographic algorithms (MD5, SHA1, weak keys).",
      severity: "HIGH" as const,
      category: "cryptography",
      defaultEnabled: true,
      order: 7,
    },
    {
      name: "Authentication Issues",
      instructions:
        "Check for authentication bypass, weak password policies, or insecure session management.",
      severity: "CRITICAL" as const,
      category: "authentication",
      defaultEnabled: true,
      order: 8,
    },
    {
      name: "Authorization Checks",
      instructions:
        "Ensure proper authorization checks are in place for sensitive operations.",
      severity: "CRITICAL" as const,
      category: "authorization",
      defaultEnabled: true,
      order: 9,
    },
    {
      name: "Unsafe Regex",
      instructions:
        "Detect regular expressions vulnerable to ReDoS (Regular Expression Denial of Service).",
      severity: "MEDIUM" as const,
      category: "regex",
      defaultEnabled: true,
      order: 10,
    },
    {
      name: "CORS Misconfiguration",
      instructions:
        "Check for overly permissive CORS configurations that could expose the API.",
      severity: "MEDIUM" as const,
      category: "configuration",
      defaultEnabled: true,
      order: 11,
    },
    {
      name: "Sensitive Data Exposure",
      instructions:
        "Identify logging or error messages that might expose sensitive information.",
      severity: "MEDIUM" as const,
      category: "data-exposure",
      defaultEnabled: true,
      order: 12,
    },
  ];

  for (const rule of secRules) {
    await db.insert(rules).values({
      id: createId(),
      agentTemplateId: secAgentId,
      ownerGhOrganizationId: null, // System rules
      ...rule,
    });
  }
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
