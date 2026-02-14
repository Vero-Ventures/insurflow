import { z } from "zod";
import { decimalString } from "@/lib/validation/client";

/**
 * Validation schema for ownership percentage (0–100)
 */
export const ownershipPercentageSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Invalid ownership percentage format")
  .refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 100;
    },
    { message: "Ownership percentage must be between 0 and 100" },
  );

/**
 * Validation schema for creating a key person
 */
export const createKeyPersonSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(255),
    role: z.string().min(1, "Role is required").max(255),
    compensation: decimalString("compensation").default("0"),
    ownershipPercentage: ownershipPercentageSchema.default("0"),
  })
  .strict();

/**
 * Validation schema for updating a key person
 */
export const updateKeyPersonSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(255).optional(),
    role: z.string().min(1, "Role is required").max(255).optional(),
    compensation: decimalString("compensation").optional(),
    ownershipPercentage: ownershipPercentageSchema.optional(),
  })
  .strict();
