import { db } from "@/lib/prisma";
import { ingestETFData } from "./fetcher";
import { computeMetrics } from "./metrics";
import { detectAnomalies } from "./anomaly";
import { sectorETFMap, getBaseIndustry } from "@/data/sector-etfs";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

/**
 * Full pipeline: fetch market data → compute metrics → generate AI narrative
 * Logs status at each stage to DataRefreshLog.
 * Returns the final IndustryInsight record.
 */
export async function runPipeline(industry) {
  const baseIndustry = getBaseIndustry(industry) || industry;
  const etfs = sectorETFMap[baseIndustry];

  if (!etfs || etfs.length === 0) {
    throw new Error(`No ETF mapping for industry: ${industry} (base: ${baseIndustry})`);
  }

  // Create log entry
  const log = await db.dataRefreshLog.create({
    data: { industry, status: "fetching" },
  });

  const startTime = Date.now();

  try {
    // ── Stage 1: Fetch ──────────────────────────────────
    await updateLog(log.id, "fetching", "Pulling market data from Alpha Vantage...");

    let fetchedAtLeastOne = false;
    for (const etf of etfs) {
      try {
        await ingestETFData(industry, etf.symbol, etf.name);
        fetchedAtLeastOne = true;
        // Small delay between ETF fetches to avoid Alpha Vantage rate limits
        // (free tier: 5 requests/minute). Only needed when there are multiple ETFs.
        if (etfs.length > 1) {
          await sleep(13000); // ~13s gap keeps us safely under 5 req/min
        }
      } catch (err) {
        console.error(`Failed to fetch ${etf.symbol}:`, err.message);
        // Continue with other ETFs — partial data is better than none
      }
    }

    if (!fetchedAtLeastOne) {
      throw new Error(
        "All ETF fetches failed. This is likely an Alpha Vantage rate limit (25 req/day on free tier). Try again tomorrow or upgrade your API key."
      );
    }

    // ── Stage 2: Compute ────────────────────────────────
    await updateLog(log.id, "computing", "Computing SMA, volatility, returns...");

    const metrics = await computeMetrics(industry);
    if (!metrics) {
      throw new Error("Insufficient market data to compute metrics");
    }

    // ── Stage 3: Anomaly Detection ────────────────────────
    await updateLog(log.id, "computing", "Detecting market anomalies...");

    const anomalies = await detectAnomalies(industry);

    // ── Stage 4: AI Narrative ───────────────────────────
    await updateLog(log.id, "narrating", "Generating AI analysis with real data...");

    const narrative = await generateNarrative(industry, metrics, anomalies);

    // ── Stage 5: Store final insight ────────────────────
    const insight = await db.industryInsight.upsert({
      where: { industry },
      update: {
        growthRate: metrics.returnYTD || 0,
        demandLevel: getDemandLevel(metrics),
        marketOutlook: getOutlook(metrics),
        aiNarrative: narrative.summary,
        salaryRanges: narrative.salaryRanges || [],
        topSkills: narrative.topSkills || [],
        keyTrends: narrative.keyTrends || [],
        recommendedSkills: narrative.recommendedSkills || [],
        lastUpdated: new Date(),
        nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      create: {
        industry,
        growthRate: metrics.returnYTD || 0,
        demandLevel: getDemandLevel(metrics),
        marketOutlook: getOutlook(metrics),
        aiNarrative: narrative.summary,
        salaryRanges: narrative.salaryRanges || [],
        topSkills: narrative.topSkills || [],
        keyTrends: narrative.keyTrends || [],
        recommendedSkills: narrative.recommendedSkills || [],
        nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const durationMs = Date.now() - startTime;
    await updateLog(log.id, "completed", `Pipeline completed in ${durationMs}ms`, durationMs);

    return insight;
  } catch (err) {
    const durationMs = Date.now() - startTime;
    await updateLog(log.id, "failed", err.message, durationMs);
    throw err;
  }
}

async function generateNarrative(industry, metrics, anomalies = []) {
  const anomalyContext = anomalies.length > 0
    ? `\n    DETECTED ANOMALIES (rolling Z-score ±2σ):\n${anomalies
        .slice(0, 5)
        .map((a) => `    - ${a.date.toISOString().split("T")[0]}: ${a.direction} of ${Math.abs(a.dailyReturn).toFixed(2)}% (Z=${a.zScore}, ${a.magnitude})`)
        .join("\n")}`
    : "";

  const prompt = `
    You are a financial analyst. Based on the following REAL computed market metrics for the "${industry}" sector, provide analysis.

    REAL METRICS (computed from market data):
    - Latest Close: $${metrics.latestClose?.toFixed(2) || "N/A"}
    - 20-day SMA: $${metrics.sma20?.toFixed(2) || "N/A"}
    - 50-day SMA: $${metrics.sma50?.toFixed(2) || "N/A"}
    - 30-day Annualized Volatility: ${metrics.volatility30d?.toFixed(1) || "N/A"}%
    - YTD Return: ${metrics.returnYTD?.toFixed(2) || "N/A"}%
    - MTD Return: ${metrics.returnMTD?.toFixed(2) || "N/A"}%
    - Data Points: ${metrics.dataPointsCount}
    ${anomalyContext}

    IMPORTANT: Return ONLY a raw JSON object. No markdown, no code fences, no explanation before or after. Start your response with { and end with }.

    {
      "summary": "2-3 paragraph analysis of current sector conditions based on the metrics above. Reference specific numbers.${anomalies.length > 0 ? " Mention detected anomalies and what they might indicate." : ""}",
      "salaryRanges": [
        {"role": "string", "min": number, "max": number, "median": number, "location": "string"}
      ],
      "topSkills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
      "keyTrends": ["trend1", "trend2", "trend3", "trend4", "trend5"],
      "recommendedSkills": ["skill1", "skill2", "skill3", "skill4", "skill5"]
    }

    Include at least 5 roles in salaryRanges. The summary MUST reference the actual metrics provided.
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Robustly extract JSON — Gemini sometimes adds preamble text or
    // wraps in markdown fences even when instructed not to.
    // Find the first { and last } to isolate the JSON object.
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("No JSON object found in Gemini response");
    }

    const jsonString = text.slice(firstBrace, lastBrace + 1);
    const parsed = JSON.parse(jsonString);

    // Fill in defaults for any missing arrays
    if (!parsed.keyTrends?.length) {
      parsed.keyTrends = [
        "AI & Machine Learning in Finance",
        "ESG Integration",
        "Digital Transformation",
        "Regulatory Technology",
        "Data-Driven Decision Making",
      ];
    }
    if (!parsed.recommendedSkills?.length) {
      parsed.recommendedSkills = [
        "Financial Modeling",
        "Python/R Programming",
        "Risk Analysis",
        "Data Visualization",
        "Quantitative Methods",
      ];
    }
    if (!parsed.topSkills?.length) {
      parsed.topSkills = [
        "Valuation Analysis",
        "Portfolio Management",
        "Financial Statement Analysis",
        "Market Research",
        "Strategic Thinking",
      ];
    }
    if (!parsed.salaryRanges?.length) {
      parsed.salaryRanges = [];
    }

    return parsed;
  } catch (err) {
    console.error("AI narrative generation failed:", err.message);
    // Fallback: return a minimal valid object so the rest of the
    // pipeline still completes and stores something useful
    return {
      summary: `Market data shows a ${metrics.returnYTD?.toFixed(1) || 0}% YTD return with ${metrics.volatility30d?.toFixed(1) || 0}% annualized volatility. SMA20 at $${metrics.sma20?.toFixed(2) || "N/A"}, SMA50 at $${metrics.sma50?.toFixed(2) || "N/A"}.`,
      salaryRanges: [],
      topSkills: [
        "Valuation Analysis",
        "Portfolio Management",
        "Financial Statement Analysis",
        "Market Research",
        "Strategic Thinking",
      ],
      keyTrends: [
        "AI & Machine Learning in Finance",
        "ESG Integration",
        "Digital Transformation",
        "Regulatory Technology",
        "Data-Driven Decision Making",
      ],
      recommendedSkills: [
        "Financial Modeling",
        "Python/R Programming",
        "Risk Analysis",
        "Data Visualization",
        "Quantitative Methods",
      ],
    };
  }
}

function getDemandLevel(metrics) {
  if (!metrics.returnYTD) return "Medium";
  if (metrics.returnYTD > 10) return "High";
  if (metrics.returnYTD > 0) return "Medium";
  return "Low";
}

function getOutlook(metrics) {
  if (!metrics.sma20 || !metrics.sma50) return "Neutral";
  if (metrics.sma20 > metrics.sma50 && metrics.returnMTD > 0) return "Positive";
  if (metrics.sma20 < metrics.sma50 && metrics.returnMTD < 0) return "Negative";
  return "Neutral";
}

async function updateLog(id, status, message, durationMs) {
  await db.dataRefreshLog.update({
    where: { id },
    data: {
      status,
      message,
      ...(status === "completed" || status === "failed"
        ? { completedAt: new Date(), durationMs }
        : {}),
    },
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
