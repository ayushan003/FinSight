import { db } from "@/lib/prisma";
import { runPipeline } from "@/lib/pipeline/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  // Verify cron secret to prevent unauthorized triggers
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Find all industries with stale data (nextUpdate in the past)
    const staleInsights = await db.industryInsight.findMany({
      where: {
        nextUpdate: { lt: new Date() },
      },
      select: { industry: true },
      take: 5, // Process max 5 per cron run to stay within API limits
    });

    const results = [];

    for (const { industry } of staleInsights) {
      try {
        await runPipeline(industry);
        results.push({ industry, status: "refreshed" });
      } catch (err) {
        results.push({ industry, status: "failed", error: err.message });
      }
    }

    return Response.json({
      refreshed: results.filter((r) => r.status === "refreshed").length,
      failed: results.filter((r) => r.status === "failed").length,
      results,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
