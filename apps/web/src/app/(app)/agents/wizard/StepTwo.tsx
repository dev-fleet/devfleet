"use client";

import { useState, useMemo, useEffect } from "react";
import { useAgentTemplates } from "@/hooks/useAgentTemplates";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Switch } from "@workspace/ui/components/switch";
import { Loader2 } from "lucide-react";

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

  const rulesByCategory = useMemo(() => {
    if (!template?.rules) return new Map();

    const map = new Map<string, typeof template.rules>();
    template.rules.forEach((rule) => {
      const category = rule.category || "other";
      if (!map.has(category)) {
        map.set(category, []);
      }
      map.get(category)!.push(rule);
    });

    // Sort rules within each category by order
    map.forEach((rules) => {
      rules.sort((a, b) => a.order - b.order);
    });

    return map;
  }, [template]);

  const handleToggle = (ruleId: string) => {
    setRuleStates((prev) => ({
      ...prev,
      [ruleId]: !prev[ruleId],
    }));
  };

  const handleToggleAll = (enabled: boolean) => {
    if (!template?.rules) return;
    const newStates: Record<string, boolean> = {};
    template.rules.forEach((rule) => {
      newStates[rule.id] = enabled;
    });
    setRuleStates(newStates);
  };

  const handleContinue = () => {
    const rules = Object.entries(ruleStates).map(([ruleId, enabled]) => ({
      ruleId,
      enabled,
    }));
    onComplete(rules);
  };

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "secondary";
    }
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

      {/* Toggle all controls */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
        <div>
          <p className="font-medium">
            {enabledCount} of {totalCount} rules enabled
          </p>
          <p className="text-sm text-muted-foreground">
            Toggle all rules on or off
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleAll(true)}
          >
            Enable All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleAll(false)}
          >
            Disable All
          </Button>
        </div>
      </div>

      {/* Rules list grouped by category */}
      <div className="space-y-6">
        {Array.from(rulesByCategory.entries()).map(([category, catRules]) => (
          <div key={category}>
            <h3 className="mb-3 text-sm font-semibold capitalize">
              {category.replace(/-/g, " ")}
            </h3>
            <div className="space-y-3">
              {catRules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{rule.name}</h4>
                        <Badge
                          variant={getSeverityVariant(rule.severity) as any}
                        >
                          {rule.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {rule.description}
                      </p>
                    </div>
                    <Switch
                      checked={ruleStates[rule.id] || false}
                      onCheckedChange={() => handleToggle(rule.id)}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

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
