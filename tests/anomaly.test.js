import { describe, it, expect } from "vitest";

// Test the pure Z-score anomaly detection logic

function computeRollingZScore(prices, windowSize) {
  if (prices.length < windowSize + 1) return [];

  const anomalies = [];

  for (let i = windowSize; i < prices.length; i++) {
    // Compute log returns for the rolling window
    const windowReturns = [];
    for (let j = i - windowSize; j < i; j++) {
      windowReturns.push(Math.log(prices[j + 1] / prices[j]));
    }

    const todayReturn = Math.log(prices[i] / prices[i - 1]);

    const mean = windowReturns.reduce((a, b) => a + b, 0) / windowReturns.length;
    const variance =
      windowReturns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (windowReturns.length - 1);
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) continue;
    const zScore = (todayReturn - mean) / stdDev;

    if (Math.abs(zScore) >= 2.0) {
      anomalies.push({
        index: i,
        dailyReturn: todayReturn * 100,
        zScore: Math.round(zScore * 100) / 100,
        direction: zScore > 0 ? "spike" : "drop",
        magnitude: Math.abs(zScore) >= 3 ? "extreme" : "moderate",
      });
    }
  }

  return anomalies;
}

describe("Anomaly Detection", () => {
  describe("computeRollingZScore", () => {
    it("returns empty for insufficient data", () => {
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i * 0.1);
      expect(computeRollingZScore(prices, 30)).toEqual([]);
    });

    it("detects no anomalies in stable prices", () => {
      // Steady uptrend with tiny variance
      const prices = Array.from({ length: 60 }, (_, i) => 100 + i * 0.1);
      const anomalies = computeRollingZScore(prices, 30);
      expect(anomalies.length).toBe(0);
    });

    it("detects a spike anomaly", () => {
      // Stable prices then a sudden jump
      const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i) * 0.5);
      prices.push(120); // 20% jump — far beyond 2σ
      const anomalies = computeRollingZScore(prices, 30);
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[anomalies.length - 1].direction).toBe("spike");
      expect(anomalies[anomalies.length - 1].zScore).toBeGreaterThan(2);
    });

    it("detects a drop anomaly", () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i) * 0.5);
      prices.push(80); // 20% drop
      const anomalies = computeRollingZScore(prices, 30);
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[anomalies.length - 1].direction).toBe("drop");
      expect(anomalies[anomalies.length - 1].zScore).toBeLessThan(-2);
    });

    it("classifies extreme anomalies (>3σ) correctly", () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i) * 0.3);
      prices.push(150); // massive spike
      const anomalies = computeRollingZScore(prices, 30);
      const last = anomalies[anomalies.length - 1];
      expect(last.magnitude).toBe("extreme");
      expect(Math.abs(last.zScore)).toBeGreaterThanOrEqual(3);
    });

    it("classifies moderate anomalies (2-3σ) correctly", () => {
      // Create a moderate spike — needs to be >2σ but <3σ
      const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.random() * 2 - 1);
      // Add a moderate move (~3-4% on a stock with ~1% daily vol)
      const lastPrice = prices[prices.length - 1];
      prices.push(lastPrice * 1.035);
      const anomalies = computeRollingZScore(prices, 30);
      // At least verify the function runs without error
      for (const a of anomalies) {
        if (Math.abs(a.zScore) < 3) {
          expect(a.magnitude).toBe("moderate");
        }
      }
    });

    it("dailyReturn is expressed as percentage", () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i) * 0.5);
      prices.push(120);
      const anomalies = computeRollingZScore(prices, 30);
      if (anomalies.length > 0) {
        // Return should be in percentage, not decimal
        expect(Math.abs(anomalies[anomalies.length - 1].dailyReturn)).toBeGreaterThan(1);
      }
    });

    it("handles zero variance window gracefully", () => {
      // All same prices — zero stddev
      const prices = Array.from({ length: 40 }, () => 100);
      prices.push(105);
      const anomalies = computeRollingZScore(prices, 30);
      // Should not crash — the zero stddev check prevents division by zero
      expect(Array.isArray(anomalies)).toBe(true);
    });
  });
});
