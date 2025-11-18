"use client";

import { useDashboardStats } from "@/utils/swr/dashboard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import { Activity, CheckCircle, DollarSign, Cpu } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

const chartConfig = {
  runs: {
    label: "Runs",
    color: "hsl(var(--chart-1))",
  },
  cost: {
    label: "Cost",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function DashboardMetrics() {
  const { data, isLoading, error } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-4 w-4 bg-muted rounded-full" />
              </CardHeader>
              <CardContent>
                <div className="h-7 w-16 bg-muted rounded mb-1" />
                <div className="h-3 w-24 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 w-48 bg-muted rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full bg-muted/10 rounded flex items-end justify-between p-4 gap-2">
              {[35, 60, 45, 70, 50, 40, 65, 30, 55, 80, 45, 60].map(
                (height, i) => (
                  <div
                    key={i}
                    className="w-full bg-muted/20 rounded-t"
                    style={{ height: `${height}%` }}
                  />
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 border rounded-md bg-destructive/10 text-destructive">
        Failed to load dashboard metrics.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Runs (30d)
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalRuns}</div>
            <p className="text-xs text-muted-foreground">PR checks processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.successRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Checks passed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Est. Cost (30d)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.totalCost.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">API usage cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tokens Consumed
            </CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(data.totalTokens / 1000).toFixed(1)}k
            </div>
            <p className="text-xs text-muted-foreground">
              Input + Output tokens
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Activity & Cost (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart data={data.chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  stroke="var(--color-runs)"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="var(--color-cost)"
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  yAxisId="left"
                  dataKey="runs"
                  fill="var(--color-runs)"
                  radius={[4, 4, 0, 0]}
                  name="Check Runs"
                />
                <Bar
                  yAxisId="right"
                  dataKey="cost"
                  fill="var(--color-cost)"
                  radius={[4, 4, 0, 0]}
                  name="Cost ($)"
                  opacity={0.5}
                />
              </BarChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
