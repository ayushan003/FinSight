import { z } from "zod";

export const onboardingSchema = z.object({
  industry: z.string({
    required_error: "Please select a financial sector",
  }),
  subIndustry: z.string({
    required_error: "Please select a focus area",
  }),
  bio: z.string().max(500).optional(),
  experience: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(
      z
        .number()
        .min(0, "Experience must be at least 0 years")
        .max(50, "Experience cannot exceed 50 years")
    ),
  skills: z.string().transform((val) =>
    val
      ? val
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean)
      : []
  ),
});

export const updateUserSchema = z.object({
  industry: z.string().min(1, "Industry is required"),
  subIndustry: z.string().optional(),
  bio: z.string().max(500).optional(),
  experience: z.number().min(0).max(50),
  skills: z.array(z.string()).optional().default([]),
});

export const reportSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  sector: z.string().min(1, "Sector is required"),
  companyDescription: z.string().min(1, "Company description is required"),
});
