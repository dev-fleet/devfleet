import { type ReactNode, Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentOnboardingStep } from "@/actions/onboarding";

import {
  SidebarProvider,
  SidebarInset,
} from "@workspace/ui/components/sidebar";
import { AppSidebar } from "@/components/sidebar/sidebar";
import type { Metadata } from "next";
import { getSession } from "@/utils/auth";

export const metadata: Metadata = {
  title: "Product Dashboard",
  description: "Dashboard for Product",
};

const DashboardLayout = async ({
  children,
}: {
  children: ReactNode;
}) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Check if user has completed onboarding
  const onboardingData = await getCurrentOnboardingStep();

  // If user hasn't completed onboarding, redirect to onboarding
  if (onboardingData?.onboardingStep !== "completed") {
    redirect("/onboarding");
  }

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
};
export default DashboardLayout;
