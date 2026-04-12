import { db } from "@/lib/prisma";

/**
 * Compute metrics from stored market data points for a given industry.
 * Uses the first ETF mapped to the industry as the primary data source.
 *
 * Computed:
 *  - SMA20 (20-day simple moving average)
 *  - SMA50 (50-day simple moving average)
 *  - 30-day annualized volatility
 *  - Month-to-date return
 *  - Year-to-date return
 *  - Average volume (20-day)
 */
export async function computeMetrics(industry) {
  // Find primary ETF for this industry
  const etf = await db.sectorETF.findFirst({
    where: { industry },
    include: {
      dataPoints: {
        orderBy: { date: "desc" },
        take: 252, // ~1 year of trading days
      },
    },
  });

  if (!etf || etf.dataPoints.length < 5) {
    return null; // Not enough data
  }

  const points = etf.dataPoints.reverse(); // oldest first
  const closes = points.map((p) => p.close);
  const volumes = points.map((p) => Number(p.volume));
  const n = closes.length;

  // Latest and previous close
  const latestClose = closes[n - 1];
  const previousClose = n >= 2 ? closes[n - 2] : null;

  // SMA calculations
  const sma20 = n >= 20 ? mean(closes.slice(-20)) : null;
  const sma50 = n >= 50 ? mean(closes.slice(-50)) : null;

  // 30-day annualized volatility
  let volatility30d = null;
  if (n >= 31) {
    const recent30 = closes.slice(-31);
    const dailyReturns = [];
    for (let i = 1; i < recent30.length; i++) {
      dailyReturns.push(Math.log(recent30[i] / recent30[i - 1]));
    }
    const stdDev = standardDeviation(dailyReturns);
    volatility30d = stdDev * Math.sqrt(252) * 100; // annualized, as percentage
  }

  // YTD return
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const firstOfYear = points.find((p) => p.date >= yearStart);
  const returnYTD = firstOfYear
    ? ((latestClose - firstOfYear.close) / firstOfYear.close) * 100
    : null;

  // MTD return
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfMonth = points.find((p) => p.date >= monthStart);
  const returnMTD = firstOfMonth
    ? ((latestClose - firstOfMonth.close) / firstOfMonth.close) * 100
    : null;

  // Average volume (20-day)
  const avgVolume = n >= 20
    ? BigInt(Math.round(mean(volumes.slice(-20))))
    : BigInt(Math.round(mean(volumes)));

  const metrics = {
    sma20,
    sma50,
    volatility30d,
    returnYTD,
    returnMTD,
    avgVolume,
    latestClose,
    previousClose,
    dataPointsCount: n,
  };

  // Upsert computed metrics
  await db.computedMetrics.upsert({
    where: { industry },
    update: { ...metrics, computedAt: new Date() },
    create: { industry, ...metrics },
  });

  return metrics;
}

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function standardDeviation(arr) {
  const m = mean(arr);
  const variance = arr.reduce((sum, val) => sum + (val - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}
