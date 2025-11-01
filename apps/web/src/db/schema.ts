import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
  primaryKey,
  jsonb,
  customType,
  uniqueIndex,
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
const ONBOARDING_STEPS = [
  "github",
  "environment",
  "agent",
  "completed",
] as const;
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
    ...timestamps,
  },
  (table) => [
    uniqueIndex("gh_organizations_organization_id_uq").on(table.organizationId),
    index("gh_organizations_login_idx").on(table.login),
  ]
);

export const installations = pgTable(
  "installations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    ghOrganizationId: text("gh_organization_id")
      .notNull()
      .references(() => ghOrganizations.id),
    githubInstallationId: text("github_installation_id").notNull(),
    targetType: text("target_type", {
      enum: ["USER", "ORG"],
    }).notNull(),
    permissions: jsonb("permissions"),
    suspended: boolean("suspended").default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("installations_github_id_uq").on(table.githubInstallationId),
    index("installations_organization_idx").on(table.ghOrganizationId),
  ]
);

export const repositories = pgTable(
  "repositories",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    ownerGhOrganizationId: text("owner_gh_organization_id")
      .notNull()
      .references(() => ghOrganizations.id),
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
    ghOrganizationId: text("gh_organization_id")
      .notNull()
      .references(() => ghOrganizations.id, { onDelete: "cascade" }),
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
  ]
);

// export const repositories = pgTable(
//   "repositories",
//   {
//     id: text("id")
//       .primaryKey()
//       .$defaultFn(() => createId()),
//     githubId: text("github_id").notNull().unique(),
//     name: text("name").notNull(),
//     fullName: text("full_name").notNull(),
//     description: text("description"),
//     private: boolean("private").notNull().default(false),
//     htmlUrl: text("html_url").notNull(),
//     cloneUrl: text("clone_url").notNull(),
//     sshUrl: text("ssh_url").notNull(),
//     defaultBranch: text("default_branch").notNull().default("main"),
//     language: text("language"),
//     stargazersCount: integer("stargazers_count").default(0),
//     forksCount: integer("forks_count").default(0),
//     openIssuesCount: integer("open_issues_count").default(0),
//     visibility: text("visibility").notNull().default("private"), // 'public', 'private', 'internal'
//     archived: boolean("archived").notNull().default(false),
//     disabled: boolean("disabled").notNull().default(false),
//     pushedAt: timestamp("pushed_at"),
//     organizationId: text("organization_id")
//       .notNull()
//       .references(() => organizations.id, { onDelete: "cascade" }),
//     ...timestamps,
//   },
//   (table) => [
//     index("repositories_organization_id_idx").on(table.organizationId),
//   ]
// );

/*************************************************************************
 *
 *                           RELATIONS
 *
 *************************************************************************/

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
// export type PrStatus = (typeof PR_STATUSES)[number];

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type GhOrganization = typeof ghOrganizations.$inferSelect;
export type NewGhOrganization = typeof ghOrganizations.$inferInsert;
export type Installation = typeof installations.$inferSelect;
export type NewInstallation = typeof installations.$inferInsert;
export type Repository = typeof repositories.$inferSelect;
export type NewRepository = typeof repositories.$inferInsert;
