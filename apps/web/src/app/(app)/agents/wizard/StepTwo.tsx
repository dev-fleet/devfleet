"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useAgentTemplates } from "@/hooks/useAgentTemplates";
import { Button } from "@workspace/ui/components/button";
import { Loader2 } from "lucide-react";
import {
  AgentRulesManager,
  type AgentRule,
} from "@/components/agent-rules-manager";

interface StepTwoProps {
  agentTemplateId: string;
  onComplete: (rules: { ruleId: string; enabled: boolean }[]) => void;
  onBack: () => void;
}

export function StepTwo({ agentTemplateId, onComplete, onBack }: StepTwoProps) {
  const { data, isLoading } = useAgentTemplates();
  const [ruleStates, setRuleStates] = useState<Record<string, boolean>>({});

  const template = useMemo(() => {
    return data?.agentTemplates?.find((t) => t.id === agentTemplateId);
  }, [data, agentTemplateId]);

  // Initialize rule states with defaults
  useEffect(() => {
    if (template?.rules) {
      const initialStates: Record<string, boolean> = {};
      template.rules.forEach((rule) => {
        initialStates[rule.id] = rule.defaultEnabled;
      });
      setRuleStates(initialStates);
    }
  }, [template]);

  // Transform template rules to AgentRule format
  const transformedRules = useMemo<AgentRule[]>(() => {
    if (!template?.rules) return [];
    return template.rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      severity: rule.severity,
      category: rule.category,
      order: rule.order,
      enabled: ruleStates[rule.id] || false,
    }));
  }, [template, ruleStates]);

  const handleToggle = useCallback((ruleId: string) => {
    setRuleStates((prev) => ({
      ...prev,
      [ruleId]: !prev[ruleId],
    }));
  }, []);

  const handleBulkUpdate = useCallback(
    (updates: { ruleId: string; enabled: boolean }[]) => {
      setRuleStates((prev) => {
        const newStates = { ...prev };
        updates.forEach(({ ruleId, enabled }) => {
          newStates[ruleId] = enabled;
        });
        return newStates;
      });
    },
    []
  );

  const handleContinue = () => {
    const rules = Object.entries(ruleStates).map(([ruleId, enabled]) => ({
      ruleId,
      enabled,
    }));
    onComplete(rules);
  };

  const enabledCount = Object.values(ruleStates).filter(Boolean).length;
  const totalCount = template?.rules?.length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
        <p className="text-sm text-destructive">Template not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Configure Rules</h2>
        <p className="text-muted-foreground">
          Enable or disable rules for {template.name}. You can change these
          later.
        </p>
      </div>

      {/* Rules Manager */}
      <AgentRulesManager
        rules={transformedRules}
        onToggleRule={handleToggle}
        onBulkUpdate={handleBulkUpdate}
        showSearch={false}
      />

      {/* Navigation buttons */}
      <div className="flex justify-between border-t pt-6">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleContinue}>Continue to Repositories</Button>
      </div>
    </div>
  );
}
