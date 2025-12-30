ALTER TABLE "agent_templates" DROP CONSTRAINT "agent_templates_owner_gh_organization_id_gh_organizations_id_fk";
--> statement-breakpoint
DROP INDEX "agent_templates_owner_idx";--> statement-breakpoint
DROP INDEX "agent_templates_system_idx";--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "agent_template_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_templates" DROP COLUMN "owner_gh_organization_id";--> statement-breakpoint
ALTER TABLE "agent_templates" DROP COLUMN "is_system_template";