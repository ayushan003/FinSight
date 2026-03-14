"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { generateAIInsights } from "./dashboard";
import { dehydrateInsight, stringifyJsonField } from "@/lib/sqlite-helpers";
import { updateUserSchema } from "@/app/lib/schema";

export async function updateUser(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  // Validate input server-side
  const validated = updateUserSchema.parse(data);

  try {
    const formattedIndustry = validated.industry;

    // Check if sector insight exists
    let industryInsight = await db.industryInsight.findUnique({
      where: { industry: formattedIndustry },
    });

    // If sector doesn't exist, generate insights
    if (!industryInsight) {
      const insights = await generateAIInsights(formattedIndustry);

      industryInsight = await db.industryInsight.create({
        data: {
          industry: formattedIndustry,
          ...dehydrateInsight(insights),
          nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // Update the user
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        industry: formattedIndustry,
        experience: validated.experience,
        bio: validated.bio,
        skills: stringifyJsonField(validated.skills),
      },
    });

    revalidatePath("/");
    revalidatePath("/dashboard");
    return updatedUser;
  } catch (error) {
    console.error("Error updating user and sector:", error.message);
    throw new Error("Failed to update profile");
  }
}

export async function getUserOnboardingStatus() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
      select: { industry: true },
    });

    return {
      isOnboarded: !!user?.industry,
    };
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    throw new Error("Failed to check onboarding status");
  }
}
