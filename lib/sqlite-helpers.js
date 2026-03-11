/**
 * SQLite stores arrays/objects as JSON strings.
 * These helpers ensure consistent serialization/deserialization
 * across all server actions.
 */

export function parseJsonField(value, fallback = []) {
  if (!value) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function stringifyJsonField(value) {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

/**
 * Takes an IndustryInsight row from SQLite and parses all JSON string fields
 * into proper JS arrays/objects for the frontend.
 */
export function hydrateInsight(insight) {
  if (!insight) return null;
  return {
    ...insight,
    salaryRanges: parseJsonField(insight.salaryRanges, []),
    topSkills: parseJsonField(insight.topSkills, []),
    keyTrends: parseJsonField(insight.keyTrends, []),
    recommendedSkills: parseJsonField(insight.recommendedSkills, []),
  };
}

/**
 * Takes raw AI-generated insight object and stringifies arrays for SQLite.
 */
export function dehydrateInsight(insights) {
  return {
    salaryRanges: stringifyJsonField(insights.salaryRanges),
    growthRate: insights.growthRate,
    demandLevel: insights.demandLevel,
    topSkills: stringifyJsonField(insights.topSkills),
    marketOutlook: insights.marketOutlook,
    keyTrends: stringifyJsonField(insights.keyTrends),
    recommendedSkills: stringifyJsonField(insights.recommendedSkills),
  };
}
