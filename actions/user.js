"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { updateUserSchema } from "@/app/lib/schema";

export async function updateUser(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true },
  });

  if (!user) throw new Error("User not found");

  const validated = updateUserSchema.parse(data);

  try {
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        industry: validated.industry,
        experience: validated.experience,
        bio: validated.bio,
        skills: validated.skills || [],
      },
    });

    revalidatePath("/dashboard");
    return updatedUser;
  } catch (error) {
    console.error("Error updating user:", error.message);
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
