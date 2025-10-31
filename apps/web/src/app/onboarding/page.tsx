import { redirect } from "next/navigation";
import { getCurrentOnboardingStep } from "@/actions/onboarding";

export default async function OnboardingPage() {
  const onboardingData = await getCurrentOnboardingStep();

  // If user is not authenticated or has completed onboarding, redirect to dashboard
  if (!onboardingData || onboardingData.onboardingCompletedAt) {
    redirect("/dashboard");
  }

  // Redirect to the current onboarding step
  const currentStep = onboardingData.onboardingStep;
  redirect(`/onboarding/${currentStep}`);
}
