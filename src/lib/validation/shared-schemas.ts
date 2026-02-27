/**
 * @fileoverview Shared validation schemas for inquiries and share links.
 */

import { z } from "zod";

export const HOUSEHOLD_STATUSES = [
  "single",
  "married",
  "partnered",
  "single_parent",
] as const;

export const HOUSEHOLD_STATUS_ENUM = z.enum(HOUSEHOLD_STATUSES);

export const INQUIRY_STATUSES = [
  "pending",
  "completed",
  "viewed",
  "claimed",
  "converted",
  "archived",
] as const;

export const INQUIRY_STATUS_ENUM = z.enum(INQUIRY_STATUSES);

export const CONTACT_INFO_SCHEMA = {
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Valid email is required"),
  phone: z.string().max(20).optional(),
} as const;

export const INTAKE_DATA_SCHEMA = {
  householdStatus: HOUSEHOLD_STATUS_ENUM.optional(),
  annualHouseholdIncome: z.string().optional(),
  totalDebts: z.string().optional(),
  currentCoverage: z.string().optional(),
  primaryGoal: z.string().max(2000).optional(),
} as const;

export const ESTIMATE_DATA_SCHEMA = {
  estimatedCoverageNeed: z.string().optional(),
  estimatedGap: z.string().optional(),
  estimatedPremium: z.string().optional(),
  scenarioId: z.string().optional(),
} as const;

export const PAGINATION_SCHEMA = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
} as const;

export const createInquirySchema = z.object({
  ...CONTACT_INFO_SCHEMA,
  referralSource: z.string().max(200).optional(),
  ...INTAKE_DATA_SCHEMA,
  ...ESTIMATE_DATA_SCHEMA,
});

export const createShareLinkSchema = z.object({
  ...CONTACT_INFO_SCHEMA,
  ...INTAKE_DATA_SCHEMA,
  ...ESTIMATE_DATA_SCHEMA,
  incomeReplacementPercent: z.number().optional(),
  replacementDurationYears: z.number().optional(),
  liquidAssets: z.number().optional(),
  referrerEmail: z.string().email().optional(),
});

export const UPDATE_STATUS_SCHEMA = z.object({
  status: INQUIRY_STATUS_ENUM,
});

export const INTERSTED_SCHEMA = z.object({
  advisorEmail: z.string().email("Valid email is required").optional(),
});

export type HouseholdStatus = z.infer<typeof HOUSEHOLD_STATUS_ENUM>;
export type InquiryStatus = z.infer<typeof INQUIRY_STATUS_ENUM>;
