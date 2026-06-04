import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { runPipeline } from "@/lib/pipeline/orchestrator";
import { getRecentAnomalies } from "@/lib/pipeline/anomaly";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { industry: true },
  });

  if (!user?.industry) {
    return new Response("User not onboarded", { status: 400 });
  }

  const industry = user.industry;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Launch pipeline in background
      const pipelinePromise = runPipeline(industry);

      // Poll DataRefreshLog for status updates
      const pollInterval = setInterval(async () => {
        try {
          const log = await db.dataRefreshLog.findFirst({
            where: { industry },
            orderBy: { startedAt: "desc" },
          });

          if (log) {
            send({
              status: log.status,
              message: log.message,
              durationMs: log.durationMs,
            });

            if (log.status === "completed" || log.status === "failed") {
              clearInterval(pollInterval);
            }
          }
        } catch (err) {
          // Polling error — ignore
        }
      }, 500);

      try {
        const insight = await pipelinePromise;

        // Final metrics
        const metrics = await db.computedMetrics.findUnique({
          where: { industry },
        });

        // Fetch anomalies — was missing, caused anomalies section to
        // go blank after clicking Refresh even though data was in DB
        const anomalies = await getRecentAnomalies(industry, 10);

        send({
          status: "completed",
          message: "Dashboard updated with real market data",
          insight: {
            ...insight,
            metrics,
            anomalies,
            salaryRanges: Array.isArray(insight.salaryRanges) ? insight.salaryRanges : [],
            topSkills: Array.isArray(insight.topSkills) ? insight.topSkills : [],
            keyTrends: Array.isArray(insight.keyTrends) ? insight.keyTrends : [],
            recommendedSkills: Array.isArray(insight.recommendedSkills) ? insight.recommendedSkills : [],
          },
        });
      } catch (err) {
        send({ status: "failed", message: err.message });
      } finally {
        clearInterval(pollInterval);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
