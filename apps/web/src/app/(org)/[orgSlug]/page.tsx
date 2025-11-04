import { getSession } from "@/utils/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { env } from "@/env.mjs";
import {
  MessageCircle,
  CheckCircle,
  GitBranch,
  GitPullRequest,
} from "lucide-react";
// import { DashboardChatForm } from "./dashboard-chat-form";
import { InsetHeader } from "@/components/sidebar/inset-header";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <>
      <InsetHeader title="Home" />
      <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6 sm:space-y-8">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2">
              What can I help you build?
            </h2>
            <p className="text-sm text-gray-600">
              Ask DevFleet to build features, fix bugs, or make changes to your
              codebase.
            </p>
          </div>
          {/* <DashboardChatForm
            environments={environments}
            organization={activeOrganization}
          /> */}

          {/* Latest Threads Section */}
          <div className="mt-8 sm:mt-12">
            <h2 className="text-lg font-semibold mb-3 sm:mb-4">
              Latest Threads
            </h2>
            <div className="relative"></div>
          </div>
        </div>
      </div>
    </>
  );
}
