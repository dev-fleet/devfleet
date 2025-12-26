CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"base_prompt" text NOT NULL,
	"category" text,
	"icon" text,
	"owner_gh_organization_id" text,
	"is_system_template" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_templates_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"agent_template_id" text NOT NULL,
	"prompt" text,
	"engine" text DEFAULT 'anthropic' NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"description" text,
	"owner_gh_organization_id" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gh_organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"organization_type" text NOT NULL,
	"login" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"github_app_installation_id" text,
	"github_app_access_token" text,
	"github_app_connection_status" text DEFAULT 'never_connected' NOT NULL,
	"github_app_disconnected_at" timestamp,
	"github_app_disconnected_reason" text,
	"llm_billing_mode" text DEFAULT 'byok' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"gh_organization_id" text NOT NULL,
	"provider" text NOT NULL,
	"encrypted_key" text NOT NULL,
	"key_prefix" text NOT NULL,
	"key_suffix" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pr_check_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"repo_id" text NOT NULL,
	"pr_id" text NOT NULL,
	"agent_id" text NOT NULL,
	"status" text NOT NULL,
	"agent_stdout" text NOT NULL,
	"runtime_ms" integer NOT NULL,
	"cost_usd" numeric(10, 4),
	"tokens_in" integer,
	"tokens_out" integer,
	"raw_output" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pull_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"repo_id" text NOT NULL,
	"pr_number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"author_login" text NOT NULL,
	"state" text DEFAULT 'open' NOT NULL,
	"draft" boolean DEFAULT false NOT NULL,
	"base_sha" text NOT NULL,
	"head_sha" text NOT NULL,
	"html_url" text,
	"labels" jsonb,
	"assignees" jsonb,
	"requested_reviewers" jsonb,
	"merged_at" timestamp,
	"closed_at" timestamp,
	"merged_by" text,
	"first_review_at" timestamp,
	"approval_status" text,
	"review_count" integer DEFAULT 0,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repo_agents" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_gh_organization_id" text NOT NULL,
	"repo_id" text NOT NULL,
	"agent_id" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"disabled_due_to_github_disconnect" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repositories" (
	"id" text PRIMARY KEY NOT NULL,
	"github_id" text NOT NULL,
	"name" text NOT NULL,
	"full_name" text NOT NULL,
	"description" text,
	"private" boolean DEFAULT false NOT NULL,
	"html_url" text NOT NULL,
	"clone_url" text NOT NULL,
	"ssh_url" text NOT NULL,
	"default_branch" text DEFAULT 'main' NOT NULL,
	"language" text,
	"stargazers_count" integer DEFAULT 0,
	"forks_count" integer DEFAULT 0,
	"open_issues_count" integer DEFAULT 0,
	"visibility" text DEFAULT 'private' NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"disabled" boolean DEFAULT false NOT NULL,
	"owner_gh_organization_id" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user_gh_organization_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"gh_organization_id" text NOT NULL,
	"role" text DEFAULT 'MEMBER' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"onboarding_step" text DEFAULT 'github' NOT NULL,
	"onboarding_completed_at" timestamp,
	"default_gh_organization_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_templates" ADD CONSTRAINT "agent_templates_owner_gh_organization_id_gh_organizations_id_fk" FOREIGN KEY ("owner_gh_organization_id") REFERENCES "public"."gh_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_agent_template_id_agent_templates_id_fk" FOREIGN KEY ("agent_template_id") REFERENCES "public"."agent_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_owner_gh_organization_id_gh_organizations_id_fk" FOREIGN KEY ("owner_gh_organization_id") REFERENCES "public"."gh_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_api_keys" ADD CONSTRAINT "organization_api_keys_gh_organization_id_gh_organizations_id_fk" FOREIGN KEY ("gh_organization_id") REFERENCES "public"."gh_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pr_check_runs" ADD CONSTRAINT "pr_check_runs_repo_id_repositories_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pr_check_runs" ADD CONSTRAINT "pr_check_runs_pr_id_pull_requests_id_fk" FOREIGN KEY ("pr_id") REFERENCES "public"."pull_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pr_check_runs" ADD CONSTRAINT "pr_check_runs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_repo_id_repositories_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo_agents" ADD CONSTRAINT "repo_agents_owner_gh_organization_id_gh_organizations_id_fk" FOREIGN KEY ("owner_gh_organization_id") REFERENCES "public"."gh_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo_agents" ADD CONSTRAINT "repo_agents_repo_id_repositories_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo_agents" ADD CONSTRAINT "repo_agents_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_owner_gh_organization_id_gh_organizations_id_fk" FOREIGN KEY ("owner_gh_organization_id") REFERENCES "public"."gh_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_gh_organization_memberships" ADD CONSTRAINT "user_gh_organization_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_gh_organization_memberships" ADD CONSTRAINT "user_gh_org_members_gh_org_fk" FOREIGN KEY ("gh_organization_id") REFERENCES "public"."gh_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_default_gh_organization_id_gh_organizations_id_fk" FOREIGN KEY ("default_gh_organization_id") REFERENCES "public"."gh_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_templates_slug_uq" ON "agent_templates" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "agent_templates_category_idx" ON "agent_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "agent_templates_owner_idx" ON "agent_templates" USING btree ("owner_gh_organization_id");--> statement-breakpoint
CREATE INDEX "agent_templates_system_idx" ON "agent_templates" USING btree ("is_system_template");--> statement-breakpoint
CREATE INDEX "agents_archived_idx" ON "agents" USING btree ("archived");--> statement-breakpoint
CREATE INDEX "agents_agent_template_idx" ON "agents" USING btree ("agent_template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gh_organizations_organization_id_uq" ON "gh_organizations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "gh_organizations_login_idx" ON "gh_organizations" USING btree ("login");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_api_keys_org_provider_uq" ON "organization_api_keys" USING btree ("gh_organization_id","provider");--> statement-breakpoint
CREATE INDEX "organization_api_keys_org_idx" ON "organization_api_keys" USING btree ("gh_organization_id");--> statement-breakpoint
CREATE INDEX "pr_check_runs_pr_idx" ON "pr_check_runs" USING btree ("pr_id");--> statement-breakpoint
CREATE INDEX "pr_check_runs_agent_idx" ON "pr_check_runs" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "pr_check_runs_status_idx" ON "pr_check_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pr_check_runs_created_idx" ON "pr_check_runs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pull_requests_repo_prnum_uq" ON "pull_requests" USING btree ("repo_id","pr_number");--> statement-breakpoint
CREATE INDEX "pull_requests_repo_idx" ON "pull_requests" USING btree ("repo_id");--> statement-breakpoint
CREATE INDEX "pull_requests_state_idx" ON "pull_requests" USING btree ("state");--> statement-breakpoint
CREATE UNIQUE INDEX "repo_agents_repo_agent_uq" ON "repo_agents" USING btree ("repo_id","agent_id");--> statement-breakpoint
CREATE INDEX "repo_agents_org_repo_idx" ON "repo_agents" USING btree ("owner_gh_organization_id","repo_id");--> statement-breakpoint
CREATE INDEX "repo_agents_org_agent_idx" ON "repo_agents" USING btree ("owner_gh_organization_id","agent_id");--> statement-breakpoint
CREATE INDEX "repo_agents_enabled_idx" ON "repo_agents" USING btree ("enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "repositories_github_id_uq" ON "repositories" USING btree ("github_id");--> statement-breakpoint
CREATE INDEX "repositories_owner_organization_idx" ON "repositories" USING btree ("owner_gh_organization_id");--> statement-breakpoint
CREATE INDEX "repositories_fullname_idx" ON "repositories" USING btree ("full_name");--> statement-breakpoint
CREATE UNIQUE INDEX "user_gh_organization_memberships_user_gh_organization_uq" ON "user_gh_organization_memberships" USING btree ("user_id","gh_organization_id");--> statement-breakpoint
CREATE INDEX "user_gh_organization_memberships_user_idx" ON "user_gh_organization_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_gh_organization_memberships_gh_organization_idx" ON "user_gh_organization_memberships" USING btree ("gh_organization_id");