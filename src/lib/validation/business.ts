import { z } from "zod";
import { decimalString } from "@/lib/validation/client";

/**
 * Enum of supported business types
 */
export const BUSINESS_TYPES = [
  "corporation",
  "partnership",
  "sole_proprietorship",
  "trust",
  "other",
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

/**
 * Human-readable labels for business types
 */
export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  corporation: "Corporation",
  partnership: "Partnership",
  sole_proprietorship: "Sole Proprietorship",
  trust: "Trust",
  other: "Other",
};

/**
 * Validation schema for business type enum
 */
export const businessTypeSchema = z.enum(BUSINESS_TYPES);

/**
 * Validation schema for creating a business
 */
export const createBusinessSchema = z
  .object({
    name: z.string().min(1, "Business name is required").max(255),
    type: businessTypeSchema,
    valuation: decimalString("valuation").default("0"),
    fiscalYearEnd: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional()
      .nullable(),
  })
  .strict();

/**
 * Validation schema for updating a business
 */
export const updateBusinessSchema = z
  .object({
    name: z.string().min(1, "Business name is required").max(255).optional(),
    type: businessTypeSchema.optional(),
    valuation: decimalString("valuation").optional(),
    fiscalYearEnd: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional()
      .nullable(),
  })
  .strict();
