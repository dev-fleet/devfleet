"use client";

import { useState } from "react";
import Image from "next/image";
import { useAgentTemplates } from "@/hooks/useAgentTemplates";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Loader2 } from "lucide-react";

interface StepOneProps {
  onComplete: (agentTemplateId: string, agentTemplateName: string) => void;
}

export function StepOne({ onComplete }: StepOneProps) {
  const { data, isLoading, error } = useAgentTemplates();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (templateId: string, templateName: string) => {
    setSelectedId(templateId);
    // Automatically proceed to next step after selection
    setTimeout(() => onComplete(templateId, templateName), 150);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
        <p className="text-sm text-destructive">
          Failed to load agent templates. Please try again.
        </p>
      </div>
    );
  }

  console.log(data);
  const templates = data?.agentTemplates || [];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Select an Agent Template</h2>
        <p className="text-muted-foreground">
          Choose from available agent templates to get started.
        </p>
      </div>

      <div className="space-y-3">
        {templates.map((template) => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all hover:border-primary hover:shadow-md ${
              selectedId === template.id ? "border-primary shadow-md" : ""
            }`}
            onClick={() => handleSelect(template.id, template.name)}
          >
            <CardContent className="flex items-start gap-4 p-4">
              {/* Icon */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                {template.icon ? (
                  <Image
                    src={`/agent-icons/${template.icon}.svg`}
                    alt={`${template.name} icon`}
                    width={28}
                    height={28}
                    className="h-7 w-7"
                  />
                ) : (
                  <svg
                    className="h-7 w-7 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                    />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 space-y-2">
                <div>
                  <h3 className="font-semibold text-lg">{template.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
                </div>
                {template.category && (
                  <div className="flex gap-2">
                    <Badge variant="outline" className="capitalize">
                      {template.category}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Selection indicator */}
              <div className="flex h-12 items-center">
                {selectedId === template.id && (
                  <svg
                    className="h-6 w-6 text-primary"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          No agent templates available
        </div>
      )}
    </div>
  );
}
