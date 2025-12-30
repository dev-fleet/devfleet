"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { StepOne } from "./StepOne";
import { StepTwo } from "./StepTwo";
import { StepThree } from "./StepThree";
import { createAgentWithConfiguration } from "@/actions/agents";
import { toast } from "sonner";

export type WizardData = {
  agentTemplateId: string;
  agentTemplateName: string;
  prompt: string | null;
  isCustom: boolean;
  repositoryIds: string[];
};

export function AgentWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<Partial<WizardData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStepOneComplete = useCallback(
    (agentTemplateId: string, agentTemplateName: string) => {
      setWizardData((prev) => ({
        ...prev,
        agentTemplateId,
        agentTemplateName,
      }));
      setCurrentStep(2);
    },
    []
  );

  const handleStepTwoComplete = useCallback(
    (data: { prompt: string | null; isCustom: boolean }) => {
      setWizardData((prev) => ({
        ...prev,
        prompt: data.prompt,
        isCustom: data.isCustom,
      }));
      setCurrentStep(3);
    },
    []
  );

  const handleStepThreeComplete = useCallback(
    async (repositoryIds: string[]) => {
      if (!wizardData.agentTemplateId) {
        toast.error("Missing wizard data");
        return;
      }

      // Custom agents require a prompt, managed agents don't
      if (wizardData.isCustom && !wizardData.prompt) {
        toast.error("Custom agents require a prompt");
        return;
      }

      setIsSubmitting(true);
      try {
        const result = await createAgentWithConfiguration({
          // For managed agents, pass the template ID; for custom, pass null
          agentTemplateId: wizardData.isCustom
            ? null
            : wizardData.agentTemplateId,
          name: wizardData.agentTemplateName || "New Agent",
          engine: "anthropic",
          description: null,
          // For managed agents, prompt is null; for custom, use their prompt
          prompt: wizardData.isCustom ? wizardData.prompt : null,
          repositoryIds,
        });

        if (result.success) {
          toast.success("Agent created successfully!");
          router.push("/agents");
        } else {
          toast.error(result.error || "Failed to create agent");
        }
      } catch (error) {
        toast.error("Failed to create agent");
        console.error(error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [wizardData, router]
  );

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  }, []);

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                step === currentStep
                  ? "bg-primary text-primary-foreground"
                  : step < currentStep
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {step}
            </div>
            {step < 3 && (
              <div
                className={`h-0.5 w-16 transition-colors ${
                  step < currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      {currentStep === 1 && <StepOne onComplete={handleStepOneComplete} />}
      {currentStep === 2 && wizardData.agentTemplateId && (
        <StepTwo
          agentTemplateId={wizardData.agentTemplateId}
          onComplete={handleStepTwoComplete}
          onBack={handleBack}
        />
      )}
      {currentStep === 3 && (
        <StepThree
          onComplete={handleStepThreeComplete}
          onBack={handleBack}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
