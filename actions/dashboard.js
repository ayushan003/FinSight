"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { runPipeline } from "@/lib/pipeline/orchestrator";
import { getRecentAnomalies } from "@/lib/pipeline/anomaly";

export async function getIndustryInsights() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { industry: true },
  });

  if (!user) throw new Error("User not found");

  // Check if we have a recent insight
  let insight = await db.industryInsight.findUnique({
    where: { industry: user.industry },
  });

  // Get computed metrics for real data display
  const metrics = await db.computedMetrics.findUnique({
    where: { industry: user.industry },
  });

  if (insight) {
    const anomalies = await getRecentAnomalies(user.industry, 10);
    return {
      ...insight,
      metrics,
      anomalies,
      salaryRanges: Array.isArray(insight.salaryRanges) ? insight.salaryRanges : [],
      topSkills: Array.isArray(insight.topSkills) ? insight.topSkills : [],
      keyTrends: Array.isArray(insight.keyTrends) ? insight.keyTrends : [],
      recommendedSkills: Array.isArray(insight.recommendedSkills) ? insight.recommendedSkills : [],
    };
  }

  return null; // No data yet — client should trigger refresh
}

export async function refreshDashboardData() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { industry: true },
  });

  if (!user) throw new Error("User not found");

  const insight = await runPipeline(user.industry);

  const metrics = await db.computedMetrics.findUnique({
    where: { industry: user.industry },
  });

  return {
    ...insight,
    metrics,
    salaryRanges: Array.isArray(insight.salaryRanges) ? insight.salaryRanges : [],
    topSkills: Array.isArray(insight.topSkills) ? insight.topSkills : [],
    keyTrends: Array.isArray(insight.keyTrends) ? insight.keyTrends : [],
    recommendedSkills: Array.isArray(insight.recommendedSkills) ? insight.recommendedSkills : [],
  };
}

export async function getRefreshStatus(industry) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const log = await db.dataRefreshLog.findFirst({
    where: { industry },
    orderBy: { startedAt: "desc" },
  });

  return log;
}
