import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
  primaryKey,
  jsonb,
  numeric,
  customType,
  uniqueIndex,
  foreignKey,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";

const timestamps = {
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
};

/*************************************************************************
 *
 *                           Constants
 *
 *************************************************************************/

// const TASK_STATUSES = ["ACTIVE", "PAUSED", "TERMINATED"] as const;
const ONBOARDING_STEPS = ["github", "agent", "completed"] as const;
const PR_STATUSES = ["open", "closed", "merged", "draft"] as const;
const PR_CHECK_RUN_STATUSES = [
  "pass",
  "fail",
  "error",
  "skipped",
  "cancelled",
] as const;
export const RULE_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
// const PR_STATUSES = [
//   "NOT_CREATED",
//   "DRAFT",
//   "OPEN",
//   "MERGED",
//   "CLOSED",
// ] as const;

/*************************************************************************
 *
 *                           Tables
 *
 *************************************************************************/

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  // Onboarding state tracking
  onboardingStep: text("onboarding_step", {
    enum: ONBOARDING_STEPS,
  })
    .notNull()
    .default("github"),
  onboardingCompletedAt: timestamp("onboarding_completed_at"),
  defaultGhOrganizationId: text("default_gh_organization_id").references(
    () => ghOrganizations.id
  ),
  ...timestamps,
});

export const sessions = pgTable("sessions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  ...timestamps,
});

export const accounts = pgTable("accounts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  ...timestamps,
});

export const verifications = pgTable("verifications", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  ...timestamps,
});

export const ghOrganizations = pgTable(
  "gh_organizations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    // GitHub account id
    organizationId: text("organization_id").notNull(),
    organizationType: text("organization_type", {
      enum: ["USER", "ORG"],
    }).notNull(),
    login: text("login").notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    // Organizations install the Github App to give access to their repositories/prs
    githubAppInstallationId: text("github_app_installation_id"),
    githubAppAccessToken: text("github_app_access_token"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("gh_organizations_organization_id_uq").on(table.organizationId),
    index("gh_organizations_login_idx").on(table.login),
  ]
);

export const repositories = pgTable(
  "repositories",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    githubId: text("github_id").notNull(),
    name: text("name").notNull(),
    fullName: text("full_name").notNull(),
    description: text("description"),
    private: boolean("private").notNull().default(false),
    htmlUrl: text("html_url").notNull(),
    cloneUrl: text("clone_url").notNull(),
    sshUrl: text("ssh_url").notNull(),
    defaultBranch: text("default_branch").notNull().default("main"),
    language: text("language"),
    stargazersCount: integer("stargazers_count").default(0),
    forksCount: integer("forks_count").default(0),
    openIssuesCount: integer("open_issues_count").default(0),
    visibility: text("visibility").notNull().default("private"), // 'public', 'private', 'internal'
    archived: boolean("archived").notNull().default(false),
    disabled: boolean("disabled").notNull().default(false),
    ownerGhOrganizationId: text("owner_gh_organization_id")
      .notNull()
      .references(() => ghOrganizations.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("repositories_github_id_uq").on(table.githubId),
    index("repositories_owner_organization_idx").on(
      table.ownerGhOrganizationId
    ),
    index("repositories_fullname_idx").on(table.fullName),
  ]
);

export const userGhOrganizationMemberships = pgTable(
  "user_gh_organization_memberships",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ghOrganizationId: text("gh_organization_id").notNull(),
    role: text("role", {
      enum: ["OWNER", "MEMBER"],
    })
      .notNull()
      .default("MEMBER"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("user_gh_organization_memberships_user_gh_organization_uq").on(
      table.userId,
      table.ghOrganizationId
    ),
    index("user_gh_organization_memberships_user_idx").on(table.userId),
    index("user_gh_organization_memberships_gh_organization_idx").on(
      table.ghOrganizationId
    ),
    foreignKey({
      name: "user_gh_org_members_gh_org_fk",
      columns: [table.ghOrganizationId],
      foreignColumns: [ghOrganizations.id],
    }).onDelete("cascade"),
  ]
);

export const pullRequests = pgTable(
  "pull_requests",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    repoId: text("repo_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    prNumber: integer("pr_number").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    authorLogin: text("author_login").notNull(),
    state: text("state", { enum: PR_STATUSES }).notNull().default("open"),
    draft: boolean("draft").notNull().default(false),
    baseSha: text("base_sha").notNull(),
    headSha: text("head_sha").notNull(),
    htmlUrl: text("html_url"),
    labels: jsonb("labels"),
    assignees: jsonb("assignees"),
    requestedReviewers: jsonb("requested_reviewers"),
    mergedAt: timestamp("merged_at"),
    closedAt: timestamp("closed_at"),
    mergedBy: text("merged_by"),
    firstReviewAt: timestamp("first_review_at"),
    approvalStatus: text("approval_status", {
      enum: ["approved", "changes_requested", "pending"],
    }),
    reviewCount: integer("review_count").default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("pull_requests_repo_prnum_uq").on(t.repoId, t.prNumber),
    index("pull_requests_repo_idx").on(t.repoId),
    index("pull_requests_state_idx").on(t.state),
  ]
);

export const agentTemplates = pgTable(
  "agent_templates",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    basePrompt: text("base_prompt").notNull(),
    category: text("category"),
    icon: text("icon"),
    // System templates (owned by platform) have null owner, user templates have an owner
    ownerGhOrganizationId: text("owner_gh_organization_id").references(
      () => ghOrganizations.id,
      { onDelete: "cascade" }
    ),
    isSystemTemplate: boolean("is_system_template").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("agent_templates_slug_uq").on(table.slug),
    index("agent_templates_category_idx").on(table.category),
    index("agent_templates_owner_idx").on(table.ownerGhOrganizationId),
    index("agent_templates_system_idx").on(table.isSystemTemplate),
  ]
);

export const rules = pgTable(
  "rules",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    agentTemplateId: text("agent_template_id")
      .notNull()
      .references(() => agentTemplates.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    instructions: text("instructions").notNull(),
    severity: text("severity", { enum: RULE_SEVERITIES })
      .notNull()
      .default("MEDIUM"),
    category: text("category"),
    defaultEnabled: boolean("default_enabled").notNull().default(true),
    order: integer("order").notNull().default(0),
    // Denormalized for easier querying - inherits from parent agent template
    ownerGhOrganizationId: text("owner_gh_organization_id").references(
      () => ghOrganizations.id,
      { onDelete: "cascade" }
    ),
    ...timestamps,
  },
  (table) => [
    index("rules_agent_template_idx").on(table.agentTemplateId),
    index("rules_severity_idx").on(table.severity),
    index("rules_owner_idx").on(table.ownerGhOrganizationId),
  ]
);

export const agents = pgTable(
  "agents",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text("name").notNull(),
    agentTemplateId: text("agent_template_id")
      .notNull()
      .references(() => agentTemplates.id, { onDelete: "restrict" }),
    prompt: text("prompt"), // Optional override of base prompt
    engine: text("engine", {
      enum: ["anthropic", "openai"],
    })
      .notNull()
      .default("anthropic"),
    archived: boolean("archived").notNull().default(false),
    description: text("description"),
    ownerGhOrganizationId: text("owner_gh_organization_id")
      .notNull()
      .references(() => ghOrganizations.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    index("agents_archived_idx").on(table.archived),
    index("agents_agent_template_idx").on(table.agentTemplateId),
  ]
);

export const agentRules = pgTable(
  "agent_rules",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    ruleId: text("rule_id")
      .notNull()
      .references(() => rules.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull().default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("agent_rules_agent_rule_uq").on(table.agentId, table.ruleId),
    index("agent_rules_agent_idx").on(table.agentId),
    index("agent_rules_enabled_idx").on(table.enabled),
  ]
);

export const repoAgents = pgTable(
  "repo_agents",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    // denormalize org for fast scoping and easy uniqueness guards
    ownerGhOrganizationId: text("owner_gh_organization_id")
      .notNull()
      .references(() => ghOrganizations.id, { onDelete: "cascade" }),
    repoId: text("repo_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull().default(true),
    ...timestamps,
  },
  (table) => [
    // One agent can be attached at most once per repo
    uniqueIndex("repo_agents_repo_agent_uq").on(table.repoId, table.agentId),
    // Helpful composite for org-scoped queries
    index("repo_agents_org_repo_idx").on(
      table.ownerGhOrganizationId,
      table.repoId
    ),
    index("repo_agents_org_agent_idx").on(
      table.ownerGhOrganizationId,
      table.agentId
    ),
    index("repo_agents_enabled_idx").on(table.enabled),
  ]
);

export const prCheckRuns = pgTable(
  "pr_check_runs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    repoId: text("repo_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    prId: text("pr_id")
      .notNull()
      .references(() => pullRequests.id, { onDelete: "cascade" }),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    status: text("status", { enum: PR_CHECK_RUN_STATUSES }).notNull(),
    agentStdout: text("agent_stdout").notNull(),
    runtimeMs: integer("runtime_ms").notNull(),
    costUsd: numeric("cost_usd", { precision: 10, scale: 4 }),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    rawOutput: jsonb("raw_output"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("pr_check_runs_pr_idx").on(table.prId),
    index("pr_check_runs_agent_idx").on(table.agentId),
    index("pr_check_runs_status_idx").on(table.status),
    index("pr_check_runs_created_idx").on(table.createdAt),
  ]
);

/*************************************************************************
 *
 *                           RELATIONS
 *
 *************************************************************************/

export const agentTemplatesRelations = relations(
  agentTemplates,
  ({ one, many }) => ({
    rules: many(rules),
    agents: many(agents),
    ownerOrg: one(ghOrganizations, {
      fields: [agentTemplates.ownerGhOrganizationId],
      references: [ghOrganizations.id],
    }),
  })
);

export const rulesRelations = relations(rules, ({ one, many }) => ({
  agentTemplate: one(agentTemplates, {
    fields: [rules.agentTemplateId],
    references: [agentTemplates.id],
  }),
  agentRules: many(agentRules),
  ownerOrg: one(ghOrganizations, {
    fields: [rules.ownerGhOrganizationId],
    references: [ghOrganizations.id],
  }),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  org: one(ghOrganizations, {
    fields: [agents.ownerGhOrganizationId],
    references: [ghOrganizations.id],
  }),
  agentTemplate: one(agentTemplates, {
    fields: [agents.agentTemplateId],
    references: [agentTemplates.id],
  }),
  repoAgents: many(repoAgents),
  runs: many(prCheckRuns),
  rules: many(agentRules),
}));

export const agentRulesRelations = relations(agentRules, ({ one }) => ({
  agent: one(agents, {
    fields: [agentRules.agentId],
    references: [agents.id],
  }),
  rule: one(rules, {
    fields: [agentRules.ruleId],
    references: [rules.id],
  }),
}));

export const pullRequestsRelations = relations(
  pullRequests,
  ({ one, many }) => ({
    repo: one(repositories, {
      fields: [pullRequests.repoId],
      references: [repositories.id],
    }),
    runs: many(prCheckRuns),
  })
);

export const repoAgentsRelations = relations(repoAgents, ({ one }) => ({
  org: one(ghOrganizations, {
    fields: [repoAgents.ownerGhOrganizationId],
    references: [ghOrganizations.id],
  }),
  repo: one(repositories, {
    fields: [repoAgents.repoId],
    references: [repositories.id],
  }),
  agent: one(agents, { fields: [repoAgents.agentId], references: [agents.id] }),
}));

// export const organizationRepositories = relations(
//   organizations,
//   ({ many }) => ({
//     repositories: many(repositories),
//     environments: many(environments),
//   })
// );

// export const organizationEnvironments = relations(
//   organizations,
//   ({ many }) => ({
//     environments: many(environments),
//   })
// );

// export const repositoryEnvironment = relations(repositories, ({ one }) => ({
//   environment: one(environments, {
//     fields: [repositories.id],
//     references: [environments.repositoryId],
//   }),
// }));

// export const environmentRelations = relations(environments, ({ one }) => ({
//   organization: one(organizations, {
//     fields: [environments.organizationId],
//     references: [organizations.id],
//   }),
//   repository: one(repositories, {
//     fields: [environments.repositoryId],
//     references: [repositories.id],
//   }),
// }));

// export const userAgentSettingsRelations = relations(
//   userAgentSettings,
//   ({ one }) => ({
//     user: one(users, {
//       fields: [userAgentSettings.userId],
//       references: [users.id],
//     }),
//     organization: one(organizations, {
//       fields: [userAgentSettings.organizationId],
//       references: [organizations.id],
//     }),
//   })
// );

// export const userTasksRelations = relations(users, ({ many }) => ({
//   tasks: many(tasks),
// }));

// export const tasksRelations = relations(tasks, ({ one }) => ({
//   createdByUser: one(users, {
//     fields: [tasks.createdBy],
//     references: [users.id],
//   }),
//   organization: one(organizations, {
//     fields: [tasks.organizationId],
//     references: [organizations.id],
//   }),
// }));

/*************************************************************************
 *
 *                           Types
 *
 *************************************************************************/

// export type TaskStatus = (typeof TASK_STATUSES)[number];
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
export type PrStatus = (typeof PR_STATUSES)[number];
export type PrCheckRunStatus = (typeof PR_CHECK_RUN_STATUSES)[number];
export type RuleSeverity = (typeof RULE_SEVERITIES)[number];

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type GhOrganization = typeof ghOrganizations.$inferSelect;
export type NewGhOrganization = typeof ghOrganizations.$inferInsert;
export type Repository = typeof repositories.$inferSelect;
export type NewRepository = typeof repositories.$inferInsert;
export type PullRequest = typeof pullRequests.$inferSelect;
export type NewPullRequest = typeof pullRequests.$inferInsert;
export type AgentTemplate = typeof agentTemplates.$inferSelect;
export type NewAgentTemplate = typeof agentTemplates.$inferInsert;
export type Rule = typeof rules.$inferSelect;
export type NewRule = typeof rules.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type RepoAgent = typeof repoAgents.$inferSelect;
export type NewRepoAgent = typeof repoAgents.$inferInsert;
export type PrCheckRun = typeof prCheckRuns.$inferSelect;
export type NewPrCheckRun = typeof prCheckRuns.$inferInsert;
