import { z } from "zod";

import { STATES } from "@/lib/validation/client";

/**
 * Form state schema (uses strings for selects before validation)
 */
export const formStateSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  dateOfBirth: z.string(),
  sex: z.string(),
  state: z.string(),
  smoker: z.boolean(),
  healthRating: z.string(),
  hasSpouse: z.boolean(),
  spouseAge: z.string(),
});

export type FormState = z.infer<typeof formStateSchema>;

/**
 * Client-side validation schema (subset of server schema for form fields)
 * Uses refine to conditionally validate spouseAge when hasSpouse is true
 */
export const clientFormSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth is required (YYYY-MM-DD)"),
    sex: z.enum(["M", "F"], { message: "Sex is required" }),
    state: z.enum(STATES, { message: "State is required" }),
    smoker: z.boolean(),
    healthRating: z.enum(
      [
        "preferred_plus",
        "preferred",
        "standard_plus",
        "standard",
        "substandard",
      ],
      { message: "Health rating is required" },
    ),
    hasSpouse: z.boolean(),
    spouseAge: z.string().optional(),
  })
  .refine(
    (data) => {
      // If hasSpouse is true, spouseAge must be provided and valid
      if (data.hasSpouse) {
        if (!data.spouseAge || data.spouseAge.trim() === "") {
          return false;
        }
        const age = Number(data.spouseAge);
        return !isNaN(age) && age >= 0 && age <= 120;
      }
      return true;
    },
    {
      message: "Spouse age is required and must be between 0 and 120",
      path: ["spouseAge"],
    },
  );

export type ClientFormData = z.infer<typeof clientFormSchema>;

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
}
