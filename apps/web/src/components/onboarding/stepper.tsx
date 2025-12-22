"use client";

import { Check, Container, Bot, Key } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentOnboardingStep } from "@/actions/onboarding";
import { IconGithubLogo } from "@workspace/ui/components/github-logo";

export type OnboardingStep = "github" | "llm" | "agent" | "completed";

interface Step {
  id: OnboardingStep;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const steps: Step[] = [
  {
    id: "github",
    title: "Connect GitHub",
    icon: IconGithubLogo,
    href: "/onboarding/github",
  },
  {
    id: "agent",
    title: "Configure Agent",
    icon: Bot,
    href: "/onboarding/agent",
  },
  {
    id: "llm",
    title: "Add API Key",
    icon: Key,
    href: "/onboarding/llm",
  },
];

interface OnboardingStepperProps {
  currentStep?: OnboardingStep;
}

export function OnboardingStepper({ currentStep }: OnboardingStepperProps) {
  const pathname = usePathname();
  const [dbCurrentStep, setDbCurrentStep] = useState<OnboardingStep | null>(
    null
  );

  // Fetch current step from database
  useEffect(() => {
    const fetchCurrentStep = async () => {
      try {
        const onboardingData = await getCurrentOnboardingStep();
        if (onboardingData) {
          setDbCurrentStep(onboardingData.onboardingStep as OnboardingStep);
        }
      } catch (error) {
        console.error("Error fetching onboarding step:", error);
      }
    };

    fetchCurrentStep();
  }, []);

  // Determine current step: use props, then database, then fallback to URL
  const activeStep =
    currentStep ||
    dbCurrentStep ||
    (() => {
      if (pathname.includes("/github")) return "github";
      if (pathname.includes("/llm")) return "llm";
      if (pathname.includes("/agent")) return "agent";
      return "github";
    })();

  const getStepStatus = (
    stepId: OnboardingStep
  ): "completed" | "current" | "upcoming" => {
    const stepOrder = ["github", "agent", "llm"];
    const currentIndex = stepOrder.indexOf(activeStep);
    const stepIndex = stepOrder.indexOf(stepId);

    if (activeStep === "completed") return "completed";
    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "current";
    return "upcoming";
  };

  return (
    <nav className="space-y-8 w-fit mx-auto">
      {steps.map((step, index) => {
        const status = getStepStatus(step.id);
        const Icon = step.icon;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="relative">
            {/* Connecting line */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-5 top-10 h-8 w-0.5 transition-colors",
                  status === "completed"
                    ? "bg-primary"
                    : "bg-muted-foreground/20"
                )}
              />
            )}

            {/* Step item */}
            <div className="flex items-center space-x-3">
              {/* Step indicator */}
              <div
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                  status === "completed" &&
                    "border-primary bg-primary text-primary-foreground",
                  status === "current" &&
                    "border-primary bg-background text-primary",
                  status === "upcoming" &&
                    "border-muted-foreground/20 bg-background text-muted-foreground"
                )}
              >
                {status === "completed" ? (
                  <Check className="h-4 w-4" />
                ) : status === "current" ? (
                  <Icon className="h-6 w-6" />
                ) : (
                  <span className="text-xs font-medium">{index + 1}</span>
                )}
              </div>

              {/* Step content */}
              <div className="min-w-0 flex-1">
                <h3
                  className={cn(
                    "text-sm font-medium transition-colors",
                    status === "completed" && "text-foreground",
                    status === "current" && "text-foreground",
                    status === "upcoming" && "text-muted-foreground"
                  )}
                >
                  {step.title}
                </h3>
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
