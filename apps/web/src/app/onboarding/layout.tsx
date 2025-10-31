import { type ReactNode } from "react";
import { redirect } from "next/navigation";
import Image from "next/image";
import { getCurrentOnboardingStep } from "@/actions/onboarding";
import { OnboardingStepper } from "@/components/onboarding/stepper";

const OnboardingLayout = async ({ children }: { children: ReactNode }) => {
  // Check if user has completed onboarding
  let onboardingData;

  try {
    onboardingData = await getCurrentOnboardingStep();
  } catch (error) {
    console.error("Error in getCurrentOnboardingStep:", error);
    redirect("/login");
  }

  // If user has completed onboarding, redirect to dashboard
  if (onboardingData.onboardingCompletedAt) {
    redirect("/dashboard");
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left sidebar with stepper */}
      <div className="hidden sm:flex sm:w-80 lg:w-100 border-r bg-muted/30 p-8 flex-col relative overflow-hidden">
        <div className="flex-1">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl font-bold">Welcome to</h1>
            <div className="flex justify-center w-full">
              <Image
                src="/devfleet-logo.png"
                alt="DevFleet Logo"
                width={1024}
                height={1024}
                className="h-18 w-auto overflow-visible"
              />
            </div>
            <p className="text-muted-foreground mt-12">
              Let&rsquo;s get you set up in just a few steps
            </p>
          </div>
          <div className="mt-12">
            <OnboardingStepper />
          </div>
        </div>

        {/* DevFleet logo at bottom */}
        <Image
          src="/devfleet-large.png"
          alt="DevFleet Logo"
          width={1024}
          height={1024}
          className="absolute bottom-[-170] -left-50 min-w-[500px] h-auto"
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-8">{children}</div>
      </div>
    </div>
  );
};

export default OnboardingLayout;
