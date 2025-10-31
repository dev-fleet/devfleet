import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { CheckCircle2, Container } from "lucide-react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getOrganizationRepositories } from "@/actions/github";
import { db } from "@/db";
import { users, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { EnvironmentForm } from "@/app/(dashboard)/environments/new/environment-form";

export default async function EnvironmentOnboardingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Get the user's active organization from the database
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  let repositories: any[] = [];
  let activeOrganization: any = null;

  if (user[0]?.activeOrganizationId) {
    try {
      // Fetch the organization details
      const org = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, user[0].activeOrganizationId))
        .limit(1);

      if (org[0]) {
        activeOrganization = org[0];
        repositories = await getOrganizationRepositories(
          user[0].activeOrganizationId
        );
      }
    } catch (error) {
      console.error("Failed to fetch repositories:", error);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
          <Container className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Create Your Environment</h1>
        <p className="text-lg text-muted-foreground">
          Set up your development environment to start working on projects.
        </p>
      </div>

      {/* Main card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Container className="w-5 h-5" />
            Development Environment
          </CardTitle>
          <CardDescription>
            An environment connects a repository to your development workflow
            and provides isolated workspaces.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {repositories.length > 0 && user[0]?.activeOrganizationId ? (
            <>
              {/* Environment Form */}
              <div className="border-t pt-6">
                <EnvironmentForm
                  repositories={repositories}
                  organizationId={user[0].activeOrganizationId}
                />
              </div>
            </>
          ) : (
            <>
              {/* Benefits list */}
              <div className="space-y-4">
                <h3 className="font-medium">Environment features:</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Isolated development workspace
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Repository integration
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Branch management
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Automated deployments
                  </li>
                </ul>
              </div>

              {/* No repositories fallback */}
              <div className="text-center py-8 border rounded-lg bg-muted/30">
                <Container className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-medium mb-2">No repositories available</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You need to connect your GitHub repositories first to create
                  environments.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
