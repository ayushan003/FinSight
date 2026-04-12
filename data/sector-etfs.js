// Maps each industry ID to representative ETFs for real market data
export const sectorETFMap = {
  equity: [
    { symbol: "SPY", name: "S&P 500 ETF" },
    { symbol: "QQQ", name: "Nasdaq 100 ETF" },
  ],
  "fixed-income": [
    { symbol: "TLT", name: "20+ Year Treasury Bond ETF" },
    { symbol: "LQD", name: "Investment Grade Corporate Bond ETF" },
  ],
  banking: [
    { symbol: "XLF", name: "Financial Select Sector ETF" },
    { symbol: "KBE", name: "S&P Bank ETF" },
  ],
  wealth: [
    { symbol: "XLF", name: "Financial Select Sector ETF" },
    { symbol: "VTI", name: "Vanguard Total Stock Market ETF" },
  ],
  fintech: [
    { symbol: "ARKF", name: "ARK Fintech Innovation ETF" },
    { symbol: "XLK", name: "Technology Select Sector ETF" },
  ],
  "real-estate": [
    { symbol: "VNQ", name: "Vanguard Real Estate ETF" },
    { symbol: "IYR", name: "iShares U.S. Real Estate ETF" },
  ],
  derivatives: [
    { symbol: "SPY", name: "S&P 500 ETF" },
    { symbol: "VXX", name: "iPath Series B S&P 500 VIX" },
  ],
  "pe-vc": [
    { symbol: "PSP", name: "Invesco Global Listed Private Equity" },
    { symbol: "IPOS", name: "Renaissance IPO ETF" },
  ],
  macro: [
    { symbol: "DBC", name: "Invesco DB Commodity Index" },
    { symbol: "UUP", name: "Invesco DB US Dollar Index" },
  ],
  "corporate-finance": [
    { symbol: "XLF", name: "Financial Select Sector ETF" },
    { symbol: "SPY", name: "S&P 500 ETF" },
  ],
};

// Get base industry from compound key like "equity-large-cap-equities"
export function getBaseIndustry(industry) {
  if (!industry) return null;
  const base = industry.split("-")[0];
  // Handle multi-word base IDs
  for (const key of Object.keys(sectorETFMap)) {
    if (industry.startsWith(key)) return key;
  }
  return base;
}
