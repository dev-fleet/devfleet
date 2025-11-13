"use client";

import { useState, useMemo, useCallback } from "react";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Switch } from "@workspace/ui/components/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

type Rule = {
  id: string;
  name: string;
  description: string;
  severity: string;
  category: string | null;
  order: number;
  enabled: boolean;
};

type AgentRulesManagerProps = {
  rules: Rule[];
  onToggleRule: (ruleId: string) => void;
  onBulkUpdate?: (updates: { ruleId: string; enabled: boolean }[]) => void;
  loading?: boolean;
};

export function AgentRulesManager({
  rules,
  onToggleRule,
  onBulkUpdate,
  loading = false,
}: AgentRulesManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Get unique categories and severities
  const categories = useMemo(() => {
    const cats = new Set(rules.map((r) => r.category).filter(Boolean));
    return Array.from(cats).sort() as string[];
  }, [rules]);

  const severities = useMemo(() => {
    const sevs = new Set(rules.map((r) => r.severity));
    return Array.from(sevs).sort();
  }, [rules]);

  // Filter rules based on search and filters
  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      const matchesSearch =
        searchQuery === "" ||
        rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSeverity =
        severityFilter === "all" || rule.severity === severityFilter;

      const matchesCategory =
        categoryFilter === "all" || rule.category === categoryFilter;

      return matchesSearch && matchesSeverity && matchesCategory;
    });
  }, [rules, searchQuery, severityFilter, categoryFilter]);

  // Group filtered rules by category
  const rulesByCategory = useMemo(() => {
    const grouped = new Map<string, Rule[]>();
    filteredRules.forEach((rule) => {
      const cat = rule.category || "Uncategorized";
      if (!grouped.has(cat)) {
        grouped.set(cat, []);
      }
      grouped.get(cat)!.push(rule);
    });
    return grouped;
  }, [filteredRules]);

  const enabledCount = useMemo(
    () => rules.filter((r) => r.enabled).length,
    [rules]
  );

  const handleEnableAll = useCallback(() => {
    if (onBulkUpdate) {
      const updates = filteredRules
        .filter((r) => !r.enabled)
        .map((r) => ({ ruleId: r.id, enabled: true }));
      if (updates.length > 0) {
        onBulkUpdate(updates);
      }
    }
  }, [filteredRules, onBulkUpdate]);

  const handleDisableAll = useCallback(() => {
    if (onBulkUpdate) {
      const updates = filteredRules
        .filter((r) => r.enabled)
        .map((r) => ({ ruleId: r.id, enabled: false }));
      if (updates.length > 0) {
        onBulkUpdate(updates);
      }
    }
  }, [filteredRules, onBulkUpdate]);

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
      case "low":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with stats and bulk actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {enabledCount} of {rules.length} rules enabled
        </div>
        {onBulkUpdate && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEnableAll}
              disabled={loading}
            >
              Enable All Filtered
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisableAll}
              disabled={loading}
            >
              Disable All Filtered
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Search rules..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="sm:w-[180px]">
            <SelectValue placeholder="Filter by severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            {severities.map((sev) => (
              <SelectItem key={sev} value={sev}>
                {sev.charAt(0).toUpperCase() + sev.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="sm:w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Rules list grouped by category */}
      <div className="space-y-6">
        {Array.from(rulesByCategory.entries()).map(([category, catRules]) => (
          <div key={category}>
            <h3 className="mb-3 text-sm font-semibold capitalize">
              {category}
            </h3>
            <div className="space-y-3">
              {catRules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="flex items-start gap-4 p-4">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={() => onToggleRule(rule.id)}
                      disabled={loading}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{rule.name}</h4>
                        <Badge variant={getSeverityVariant(rule.severity) as any}>
                          {rule.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {rule.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
        {filteredRules.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            No rules match your filters
          </div>
        )}
      </div>
    </div>
  );
}

