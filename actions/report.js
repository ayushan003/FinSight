"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { reportSchema } from "@/app/lib/schema";
import { getBaseIndustry } from "@/data/sector-etfs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

function sanitizeForPrompt(str) {
  if (!str) return "";
  return str.replace(/---/g, "").replace(/```/g, "").replace(/\\/g, "").slice(0, 2000);
}

function validateUUID(id) {
  if (!id || typeof id !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Build a market context block from real computed metrics and anomalies.
 * Returns empty string if no data available (graceful degradation).
 */
async function buildMarketContext(industry) {
  const baseIndustry = getBaseIndustry(industry) || industry;

  // Pull computed metrics
  const metrics = await db.computedMetrics.findUnique({
    where: { industry },
  });

  // Pull recent anomalies
  const anomalies = await db.marketAnomaly.findMany({
    where: { industry },
    orderBy: { date: "desc" },
    take: 5,
  });

  if (!metrics) return "";

  let context = `
    LIVE SECTOR DATA (computed from real market data, not estimated):
    - Sector ETF Latest Close: $${metrics.latestClose?.toFixed(2) || "N/A"}
    - 20-Day SMA: $${metrics.sma20?.toFixed(2) || "N/A"}
    - 50-Day SMA: $${metrics.sma50?.toFixed(2) || "N/A"}
    - 30-Day Annualized Volatility: ${metrics.volatility30d?.toFixed(1) || "N/A"}%
    - YTD Return: ${metrics.returnYTD?.toFixed(2) || "N/A"}%
    - MTD Return: ${metrics.returnMTD?.toFixed(2) || "N/A"}%
    - Data as of: ${metrics.computedAt ? new Date(metrics.computedAt).toISOString().split("T")[0] : "N/A"}`;

  if (anomalies.length > 0) {
    context += `\n\n    RECENT MARKET ANOMALIES (detected via rolling 30-day Z-score, ±2σ threshold):`;
    for (const a of anomalies) {
      const dateStr = new Date(a.date).toISOString().split("T")[0];
      context += `\n    - ${dateStr}: ${a.direction} of ${Math.abs(a.dailyReturn).toFixed(2)}% (Z-score: ${a.zScore}, ${a.magnitude}) at $${a.closingPrice.toFixed(2)}`;
    }
  }

  return context;
}

export async function generateCompanyReport(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = reportSchema.parse(data);

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true, industry: true, experience: true, skills: true, bio: true },
  });

  if (!user) throw new Error("User not found");

  const skills = Array.isArray(user.skills) ? user.skills : [];

  const safeCompanyName = sanitizeForPrompt(validated.companyName);
  const safeSector = sanitizeForPrompt(validated.sector);
  const safeDescription = sanitizeForPrompt(validated.companyDescription);
  const safeIndustry = sanitizeForPrompt(user.industry);
  const safeBio = sanitizeForPrompt(user.bio);
  const safeSkills = skills.map((s) => sanitizeForPrompt(s)).join(", ");

  // Pull real market data for the user's sector
  const marketContext = await buildMarketContext(user.industry);

  const prompt = `
    Write a structured company analysis report for ${safeCompanyName} in the ${safeSector} sector.
    
    About the analyst:
    - Sector Focus: ${safeIndustry}
    - Years of Experience: ${user.experience || 0}
    - Competencies: ${safeSkills}
    - Background: ${safeBio}
    
    Company/Sector Context (user-provided):
    ${safeDescription}
    ${marketContext ? `\n    ${marketContext}` : ""}
    
    Requirements:
    1. Use a clear, analytical tone
    2. Include a brief company overview
    3. Identify key strengths and competitive advantages
    4. Assess risks and challenges
    5. Provide sector-relative competitive positioning
    ${marketContext ? "6. Reference the live sector data above — cite specific numbers (SMA, volatility, YTD return) to contextualize the company within current market conditions" : ""}
    ${marketContext && "7. If anomalies were detected, discuss what they might mean for this company's near-term outlook"}
    8. Keep it concise (max 600 words)
    9. Use structured markdown with headers
    10. Conclude with a forward-looking outlook grounded in the data
    
    Format the report in markdown.
  `;

  try {
    const result = await model.generateContent(prompt);
    const content = result.response.text().trim();

    const report = await db.companyReport.create({
      data: {
        content,
        companyDescription: validated.companyDescription,
        companyName: validated.companyName,
        sector: validated.sector,
        status: "completed",
        userId: user.id,
      },
    });

    return report;
  } catch (error) {
    console.error("Error generating analysis report:", error.message);
    throw new Error("Failed to generate analysis report");
  }
}

export async function getCompanyReports() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true },
  });

  if (!user) throw new Error("User not found");

  return await db.companyReport.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCompanyReport(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (!validateUUID(id)) throw new Error("Invalid report ID");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true },
  });

  if (!user) throw new Error("User not found");

  return await db.companyReport.findUnique({
    where: { id, userId: user.id },
  });
}

export async function deleteCompanyReport(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (!validateUUID(id)) throw new Error("Invalid report ID");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true },
  });

  if (!user) throw new Error("User not found");

  await db.companyReport.delete({
    where: { id, userId: user.id },
  });

  return { success: true };
}
