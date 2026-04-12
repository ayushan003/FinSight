import { describe, it, expect } from "vitest";

// Test the pure computation functions directly
// We extract the math from metrics.js for testability

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function standardDeviation(arr) {
  const m = mean(arr);
  const variance = arr.reduce((sum, val) => sum + (val - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function computeSMA(closes, period) {
  if (closes.length < period) return null;
  return mean(closes.slice(-period));
}

function computeVolatility(closes, period) {
  if (closes.length < period + 1) return null;
  const recent = closes.slice(-(period + 1));
  const dailyReturns = [];
  for (let i = 1; i < recent.length; i++) {
    dailyReturns.push(Math.log(recent[i] / recent[i - 1]));
  }
  return standardDeviation(dailyReturns) * Math.sqrt(252) * 100;
}

function computeReturn(closes, startIdx) {
  if (closes.length <= startIdx) return null;
  const start = closes[startIdx];
  const end = closes[closes.length - 1];
  return ((end - start) / start) * 100;
}

describe("Metrics Computation", () => {
  describe("mean()", () => {
    it("computes mean of positive numbers", () => {
      expect(mean([10, 20, 30])).toBe(20);
    });

    it("handles single element", () => {
      expect(mean([42])).toBe(42);
    });

    it("handles decimals", () => {
      expect(mean([1.5, 2.5])).toBe(2.0);
    });
  });

  describe("standardDeviation()", () => {
    it("computes sample std dev", () => {
      const result = standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]);
      expect(result).toBeCloseTo(2.138, 2);
    });

    it("returns 0 for identical values", () => {
      expect(standardDeviation([5, 5, 5, 5])).toBe(0);
    });
  });

  describe("computeSMA()", () => {
    it("computes 20-day SMA", () => {
      const closes = Array.from({ length: 25 }, (_, i) => 100 + i);
      const sma = computeSMA(closes, 20);
      // Last 20: 105..124, mean = 114.5
      expect(sma).toBe(114.5);
    });

    it("returns null if insufficient data", () => {
      expect(computeSMA([100, 101, 102], 20)).toBeNull();
    });

    it("computes 50-day SMA", () => {
      const closes = Array.from({ length: 60 }, (_, i) => 100 + i);
      const sma = computeSMA(closes, 50);
      expect(sma).not.toBeNull();
    });
  });

  describe("computeVolatility()", () => {
    it("computes annualized volatility for stable prices", () => {
      // Prices barely moving → low volatility
      const closes = Array.from({ length: 35 }, (_, i) => 100 + Math.sin(i) * 0.1);
      const vol = computeVolatility(closes, 30);
      expect(vol).toBeLessThan(10); // Should be very low
    });

    it("computes higher volatility for volatile prices", () => {
      const closes = Array.from({ length: 35 }, (_, i) => 100 + Math.sin(i) * 10);
      const vol = computeVolatility(closes, 30);
      expect(vol).toBeGreaterThan(10);
    });

    it("returns null if insufficient data", () => {
      expect(computeVolatility([100, 101], 30)).toBeNull();
    });
  });

  describe("computeReturn()", () => {
    it("computes positive return", () => {
      const closes = [100, 105, 110, 115, 120];
      const ret = computeReturn(closes, 0);
      expect(ret).toBe(20); // 20% return
    });

    it("computes negative return", () => {
      const closes = [100, 95, 90, 85, 80];
      const ret = computeReturn(closes, 0);
      expect(ret).toBe(-20);
    });

    it("returns null if startIdx out of bounds", () => {
      expect(computeReturn([100], 5)).toBeNull();
    });
  });
});
