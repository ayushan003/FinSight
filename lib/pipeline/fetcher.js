import { db } from "@/lib/prisma";

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const BASE_URL = "https://www.alphavantage.co/query";

/**
 * Fetch daily time series for a symbol from Alpha Vantage.
 * Returns parsed array of { date, open, high, low, close, volume }.
 */
export async function fetchDailyTimeSeries(symbol) {
  const url = `${BASE_URL}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=compact&apikey=${ALPHA_VANTAGE_KEY}`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    throw new Error(`Alpha Vantage API error: ${res.status}`);
  }

  const data = await res.json();

  // Handle API rate limiting / error responses
  if (data["Note"] || data["Information"]) {
    throw new Error(`Alpha Vantage rate limit: ${data["Note"] || data["Information"]}`);
  }

  const timeSeries = data["Time Series (Daily)"];
  if (!timeSeries) {
    throw new Error(`No time series data for ${symbol}. Response: ${JSON.stringify(data).slice(0, 200)}`);
  }

  return Object.entries(timeSeries)
    .map(([date, values]) => ({
      date: new Date(date),
      open: parseFloat(values["1. open"]),
      high: parseFloat(values["2. high"]),
      low: parseFloat(values["3. low"]),
      close: parseFloat(values["4. close"]),
      volume: BigInt(values["5. volume"]),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Ingest market data for a sector ETF into the database.
 * Upserts data points to avoid duplicates.
 */
export async function ingestETFData(industry, symbol, name) {
  // Ensure the ETF record exists
  let etf = await db.sectorETF.upsert({
    where: { industry_symbol: { industry, symbol } },
    update: { name },
    create: { industry, symbol, name },
  });

  const dataPoints = await fetchDailyTimeSeries(symbol);

  // Batch upsert — skip existing dates
  let inserted = 0;
  for (const point of dataPoints) {
    try {
      await db.marketDataPoint.upsert({
        where: { etfId_date: { etfId: etf.id, date: point.date } },
        update: {
          open: point.open,
          high: point.high,
          low: point.low,
          close: point.close,
          volume: point.volume,
        },
        create: {
          etfId: etf.id,
          date: point.date,
          open: point.open,
          high: point.high,
          low: point.low,
          close: point.close,
          volume: point.volume,
        },
      });
      inserted++;
    } catch (err) {
      // Skip duplicates silently
      if (!err.message?.includes("Unique constraint")) {
        console.error(`Error inserting data point for ${symbol}:`, err.message);
      }
    }
  }

  return { symbol, inserted, total: dataPoints.length };
}
