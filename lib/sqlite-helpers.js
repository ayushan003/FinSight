/**
 * JSON field helpers.
 *
 * With PostgreSQL, Prisma handles Json columns natively — values are
 * already JS arrays/objects. These helpers remain for safety: they
 * gracefully handle both string-encoded (SQLite) and native (Postgres)
 * values, so the rest of the codebase doesn't need to change.
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
  // With Postgres, Prisma accepts raw JS arrays/objects for Json fields
  // so we just return the value as-is. No need to JSON.stringify.
  if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
    return value;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

/**
 * Takes an IndustryInsight row and ensures all JSON fields
 * are proper JS arrays/objects for the frontend.
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
 * Takes raw AI-generated insight object and prepares it for storage.
 * With Postgres, arrays can be stored directly as Json.
 */
export function dehydrateInsight(insights) {
  return {
    salaryRanges: insights.salaryRanges,
    growthRate: insights.growthRate,
    demandLevel: insights.demandLevel,
    topSkills: insights.topSkills,
    marketOutlook: insights.marketOutlook,
    keyTrends: insights.keyTrends,
    recommendedSkills: insights.recommendedSkills,
  };
}
