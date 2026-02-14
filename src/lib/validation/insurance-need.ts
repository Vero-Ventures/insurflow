import { z } from "zod";
import { decimalString } from "@/lib/validation/client";

/**
 * Enum of supported corporate insurance need types
 */
export const INSURANCE_NEED_TYPES = [
  "key_person",
  "buy_sell",
  "debt_coverage",
  "succession",
  "other",
] as const;

export type InsuranceNeedType = (typeof INSURANCE_NEED_TYPES)[number];

/**
 * Human-readable labels for insurance need types
 */
export const INSURANCE_NEED_TYPE_LABELS: Record<InsuranceNeedType, string> = {
  key_person: "Key Person",
  buy_sell: "Buy-Sell Agreement",
  debt_coverage: "Debt Coverage",
  succession: "Succession Planning",
  other: "Other",
};

/**
 * Validation schema for insurance need type enum
 */
export const insuranceNeedTypeSchema = z.enum(INSURANCE_NEED_TYPES);

/**
 * Validation schema for creating a corporate insurance need
 */
export const createInsuranceNeedSchema = z
  .object({
    insuranceType: insuranceNeedTypeSchema,
    coverageAmount: decimalString("coverage amount").default("0"),
    notes: z.string().max(2000).optional().nullable(),
  })
  .strict();

/**
 * Validation schema for updating a corporate insurance need
 */
export const updateInsuranceNeedSchema = z
  .object({
    insuranceType: insuranceNeedTypeSchema.optional(),
    coverageAmount: decimalString("coverage amount").optional(),
    notes: z.string().max(2000).optional().nullable(),
  })
  .strict();
