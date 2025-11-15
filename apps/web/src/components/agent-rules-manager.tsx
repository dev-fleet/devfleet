"use client";

import { useState, useMemo, useCallback } from "react";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Switch } from "@workspace/ui/components/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { ChevronRight, Circle } from "lucide-react";

export type AgentRule = {
  id: string;
  name: string;
  description: string;
  severity: string;
  category: string | null;
  order: number;
  enabled: boolean;
};

type AgentRulesManagerProps = {
  rules: AgentRule[];
  onToggleRule: (ruleId: string) => void;
  onBulkUpdate?: (updates: { ruleId: string; enabled: boolean }[]) => void;
  loading?: boolean;
  showSearch?: boolean;
  showBulkActions?: boolean;
};

export function AgentRulesManager({
  rules,
  onToggleRule,
  onBulkUpdate,
  loading = false,
  showSearch = true,
  showBulkActions = true,
}: AgentRulesManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  const toggleExpanded = useCallback((ruleId: string) => {
    setExpandedRules((prev) => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  }, []);

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
    const grouped = new Map<string, AgentRule[]>();
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

  const getSeverityStyles = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800";
      case "low":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showSearch && (
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
      )}
      {/* Bulk actions */}
      {showBulkActions && (
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
                Enable All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisableAll}
                disabled={loading}
              >
                Disable All
              </Button>
            </div>
          )}
        </div>
      )}
      {/* Rules list grouped by category */}
      <div className="space-y-6">
        {Array.from(rulesByCategory.entries()).map(([category, catRules]) => (
          <div key={category}>
            <h3 className="mb-3 text-sm font-semibold capitalize">
              {category}
            </h3>
            <div className="overflow-hidden rounded-md border">
              {catRules.map((rule, index) => {
                const isExpanded = expandedRules.has(rule.id);
                const isLast = index === catRules.length - 1;

                return (
                  <div key={rule.id} className={!isLast ? "border-b" : ""}>
                    {/* Row */}
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                      {/* Expand button */}
                      <button
                        onClick={() => toggleExpanded(rule.id)}
                        className="flex items-center justify-center p-0.5 hover:bg-muted rounded transition-colors"
                        disabled={loading}
                      >
                        <ChevronRight
                          className={`h-4 w-4 text-muted-foreground transition-transform ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                        />
                      </button>

                      {/* Status icon */}
                      <Circle
                        className={`h-3 w-3 ${
                          rule.enabled
                            ? "fill-green-500 text-green-500"
                            : "fill-muted text-muted"
                        }`}
                      />

                      {/* Rule name (clickable) */}
                      <button
                        onClick={() => toggleExpanded(rule.id)}
                        className="flex-1 text-left font-medium hover:text-foreground/80 transition-colors"
                        disabled={loading}
                      >
                        {rule.name}
                      </button>

                      {/* Severity badge */}
                      <Badge className={getSeverityStyles(rule.severity)}>
                        {rule.severity}
                      </Badge>

                      {/* Enable/disable toggle */}
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={() => onToggleRule(rule.id)}
                        disabled={loading}
                      />
                    </div>

                    {/* Expanded description */}
                    {isExpanded && (
                      <div className="px-4 py-3 bg-muted/30 border-t">
                        <p className="text-sm text-muted-foreground pl-10">
                          {rule.description}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
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
