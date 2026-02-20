import { z } from "zod";
import { decimalString } from "@/lib/validation/client";
import { POLICY_STATUSES, POLICY_TYPES } from "@/types/policy";

/**
 * Validation schema for policy type enum
 */
export const policyTypeSchema = z.enum(POLICY_TYPES);

/**
 * Validation schema for policy status enum
 */
export const policyStatusSchema = z.enum(POLICY_STATUSES);

/**
 * Optional date string validation (YYYY-MM-DD format)
 */
const optionalDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (use YYYY-MM-DD)")
  .optional()
  .nullable();

/**
 * Validation schema for creating a policy
 */
export const createPolicySchema = z
  .object({
    policyNumber: z.string().max(100).optional().nullable(),
    carrierName: z.string().max(200).optional().nullable(),
    type: policyTypeSchema.default("term_life"),
    faceAmount: decimalString("face amount").default("0"),
    annualPremium: decimalString("annual premium").optional().nullable(),
    issueDate: optionalDateString,
    expiryDate: optionalDateString,
    cashValue: decimalString("cash value").optional().nullable(),
    status: policyStatusSchema.default("active"),
    riders: z.string().max(2000).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  })
  .strict();

/**
 * Validation schema for updating a policy
 */
export const updatePolicySchema = z
  .object({
    policyNumber: z.string().max(100).optional().nullable(),
    carrierName: z.string().max(200).optional().nullable(),
    type: policyTypeSchema.optional(),
    faceAmount: decimalString("face amount").optional(),
    annualPremium: decimalString("annual premium").optional().nullable(),
    issueDate: optionalDateString,
    expiryDate: optionalDateString,
    cashValue: decimalString("cash value").optional().nullable(),
    status: policyStatusSchema.optional(),
    riders: z.string().max(2000).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  })
  .strict();

export type CreatePolicyInput = z.infer<typeof createPolicySchema>;
export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>;
