"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseJsonField } from "@/lib/sqlite-helpers";
import { reportSchema } from "@/app/lib/schema";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function generateCompanyReport(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Validate input server-side
  const validated = reportSchema.parse(data);

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const skills = parseJsonField(user.skills, []);

  const prompt = `
    Write a structured company analysis report for ${validated.companyName} in the ${validated.sector} sector.
    
    About the analyst:
    - Sector Focus: ${user.industry}
    - Years of Experience: ${user.experience}
    - Competencies: ${skills.join(", ")}
    - Background: ${user.bio}
    
    Company/Sector Context (user-provided):
    ---BEGIN CONTEXT---
    ${validated.companyDescription}
    ---END CONTEXT---
    
    Requirements:
    1. Use a clear, analytical tone
    2. Include a brief company overview
    3. Identify key strengths and competitive advantages
    4. Assess risks and challenges
    5. Provide sector-relative competitive positioning
    6. Keep it concise (max 500 words)
    7. Use structured markdown with headers
    8. Conclude with a forward-looking outlook
    
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
  });

  if (!user) throw new Error("User not found");

  return await db.companyReport.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getCompanyReport(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.companyReport.findUnique({
    where: {
      id,
      userId: user.id,
    },
  });
}

export async function deleteCompanyReport(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.companyReport.delete({
    where: {
      id,
      userId: user.id,
    },
  });
}
