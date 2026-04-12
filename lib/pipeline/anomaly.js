import { db } from "@/lib/prisma";

const ROLLING_WINDOW = 30; // 30-day rolling window
const Z_THRESHOLD = 2.0;  // Flag moves beyond 2 standard deviations

/**
 * Detect anomalies in daily returns for a given industry.
 * Uses a rolling Z-score: if today's log return is >2σ from the
 * 30-day rolling mean, it's flagged as an anomaly.
 *
 * Returns array of newly detected anomalies.
 */
export async function detectAnomalies(industry) {
  const etf = await db.sectorETF.findFirst({
    where: { industry },
    include: {
      dataPoints: {
        orderBy: { date: "desc" },
        take: 100, // enough for 30-day rolling window + recent detection
      },
    },
  });

  if (!etf || etf.dataPoints.length < ROLLING_WINDOW + 1) {
    return [];
  }

  const points = etf.dataPoints.reverse(); // oldest first
  const anomalies = [];

  for (let i = ROLLING_WINDOW; i < points.length; i++) {
    // Compute log returns for the rolling window
    const windowReturns = [];
    for (let j = i - ROLLING_WINDOW; j < i; j++) {
      windowReturns.push(Math.log(points[j + 1].close / points[j].close));
    }

    // Today's return
    const todayReturn = Math.log(points[i].close / points[i - 1].close);

    // Rolling mean and std dev
    const mean = windowReturns.reduce((a, b) => a + b, 0) / windowReturns.length;
    const variance =
      windowReturns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (windowReturns.length - 1);
    const stdDev = Math.sqrt(variance);

    // Z-score
    if (stdDev === 0) continue; // No variation — skip
    const zScore = (todayReturn - mean) / stdDev;

    if (Math.abs(zScore) >= Z_THRESHOLD) {
      anomalies.push({
        industry,
        etfSymbol: etf.symbol,
        date: points[i].date,
        dailyReturn: todayReturn * 100, // as percentage
        zScore: Math.round(zScore * 100) / 100,
        direction: zScore > 0 ? "spike" : "drop",
        magnitude: Math.abs(zScore) >= 3 ? "extreme" : "moderate",
        closingPrice: points[i].close,
      });
    }
  }

  // Store anomalies (upsert to avoid duplicates on re-runs)
  let stored = 0;
  for (const anomaly of anomalies) {
    try {
      await db.marketAnomaly.upsert({
        where: {
          industry_etfSymbol_date: {
            industry: anomaly.industry,
            etfSymbol: anomaly.etfSymbol,
            date: anomaly.date,
          },
        },
        update: {
          dailyReturn: anomaly.dailyReturn,
          zScore: anomaly.zScore,
          direction: anomaly.direction,
          magnitude: anomaly.magnitude,
          closingPrice: anomaly.closingPrice,
        },
        create: anomaly,
      });
      stored++;
    } catch (err) {
      console.error("Error storing anomaly:", err.message);
    }
  }

  return anomalies;
}

/**
 * Get recent anomalies for an industry (for dashboard display).
 */
export async function getRecentAnomalies(industry, limit = 10) {
  return await db.marketAnomaly.findMany({
    where: { industry },
    orderBy: { date: "desc" },
    take: limit,
  });
}
