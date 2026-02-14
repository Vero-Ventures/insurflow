import { z } from "zod";
import { ownershipPercentageSchema } from "@/lib/validation/key-person";

/**
 * Validation schema for creating a shareholder
 */
export const createShareholderSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(255),
    ownershipPercentage: ownershipPercentageSchema,
  })
  .strict();

/**
 * Validation schema for updating a shareholder
 */
export const updateShareholderSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(255).optional(),
    ownershipPercentage: ownershipPercentageSchema.optional(),
  })
  .strict();
