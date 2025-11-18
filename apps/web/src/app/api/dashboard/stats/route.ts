import { withAuth } from "@/utils/middleware";
import { db } from "@/db";
import { prCheckRuns, repositories, users } from "@/db/schema";
import { eq, and, gte, sql, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { subDays, format } from "date-fns";

export type DashboardStatsResponse = Awaited<
  ReturnType<typeof getDashboardStats>
>;

async function getDashboardStats(userId: string) {
  const user = await db
    .select({ defaultGhOrganizationId: users.defaultGhOrganizationId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user[0]?.defaultGhOrganizationId) {
    throw new Error("No default organization set");
  }

  const orgId = user[0].defaultGhOrganizationId;
  const thirtyDaysAgo = subDays(new Date(), 30);

  // Fetch runs for the last 30 days for repositories in this organization
  const runs = await db
    .select({
      id: prCheckRuns.id,
      status: prCheckRuns.status,
      costUsd: prCheckRuns.costUsd,
      tokensIn: prCheckRuns.tokensIn,
      tokensOut: prCheckRuns.tokensOut,
      createdAt: prCheckRuns.createdAt,
    })
    .from(prCheckRuns)
    .innerJoin(repositories, eq(prCheckRuns.repoId, repositories.id))
    .where(
      and(
        eq(repositories.ownerGhOrganizationId, orgId),
        gte(prCheckRuns.createdAt, thirtyDaysAgo)
      )
    )
    .orderBy(desc(prCheckRuns.createdAt));

  // Calculate aggregates
  const totalRuns = runs.length;
  const successfulRuns = runs.filter((r) => r.status === "pass").length;
  const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;

  const totalCost = runs.reduce((acc, curr) => {
    return acc + (curr.costUsd ? parseFloat(curr.costUsd) : 0);
  }, 0);

  const totalTokens = runs.reduce((acc, curr) => {
    return acc + (curr.tokensIn || 0) + (curr.tokensOut || 0);
  }, 0);

  // Group by day for the chart
  // We want to ensure we have entries for all 30 days, filling with 0 if empty
  const chartDataMap = new Map<
    string,
    { date: string; runs: number; cost: number }
  >();

  // Initialize with 0s
  for (let i = 0; i < 30; i++) {
    const date = subDays(new Date(), i);
    const dateStr = format(date, "yyyy-MM-dd");
    chartDataMap.set(dateStr, { date: dateStr, runs: 0, cost: 0 });
  }

  // Fill with actual data
  runs.forEach((run) => {
    const dateStr = format(run.createdAt, "yyyy-MM-dd");
    if (chartDataMap.has(dateStr)) {
      const entry = chartDataMap.get(dateStr)!;
      entry.runs += 1;
      entry.cost += run.costUsd ? parseFloat(run.costUsd) : 0;
    }
  });

  // Convert to array and sort by date ascending
  const chartData = Array.from(chartDataMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return {
    totalRuns,
    successRate,
    totalCost,
    totalTokens,
    chartData,
  };
}

export const GET = withAuth(async (request) => {
  const userId = request.auth.userId;
  const stats = await getDashboardStats(userId);
  return NextResponse.json(stats);
});
