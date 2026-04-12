import { describe, it, expect } from "vitest";
import { sectorETFMap, getBaseIndustry } from "@/data/sector-etfs";

describe("Sector ETF Mapping", () => {
  describe("sectorETFMap", () => {
    it("has mappings for all 10 industries", () => {
      const expected = [
        "equity", "fixed-income", "banking", "wealth", "fintech",
        "real-estate", "derivatives", "pe-vc", "macro", "corporate-finance",
      ];
      for (const industry of expected) {
        expect(sectorETFMap[industry]).toBeDefined();
        expect(sectorETFMap[industry].length).toBeGreaterThan(0);
      }
    });

    it("each ETF has symbol and name", () => {
      for (const [industry, etfs] of Object.entries(sectorETFMap)) {
        for (const etf of etfs) {
          expect(etf.symbol).toBeTruthy();
          expect(etf.name).toBeTruthy();
        }
      }
    });
  });

  describe("getBaseIndustry()", () => {
    it("extracts base from compound key", () => {
      expect(getBaseIndustry("equity-large-cap-equities")).toBe("equity");
      expect(getBaseIndustry("fixed-income-government-bonds")).toBe("fixed-income");
      expect(getBaseIndustry("real-estate-reits")).toBe("real-estate");
    });

    it("handles simple keys", () => {
      expect(getBaseIndustry("equity")).toBe("equity");
      expect(getBaseIndustry("banking")).toBe("banking");
    });

    it("returns null for null/undefined", () => {
      expect(getBaseIndustry(null)).toBeNull();
      expect(getBaseIndustry(undefined)).toBeNull();
    });

    it("handles pe-vc compound key", () => {
      expect(getBaseIndustry("pe-vc-venture-capital")).toBe("pe-vc");
    });

    it("handles corporate-finance compound key", () => {
      expect(getBaseIndustry("corporate-finance-valuation-(dcf,-comps)")).toBe("corporate-finance");
    });
  });
});
