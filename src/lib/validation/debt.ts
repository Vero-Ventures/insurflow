import { z } from "zod";

/**
 * Enum of supported debt types
 */
export const DEBT_TYPES = [
  "mortgage",
  "heloc",
  "car_loan",
  "student_loan",
  "personal_loan",
  "credit_card",
  "line_of_credit",
  "business_loan",
  "other",
] as const;

/**
 * Human-readable labels for debt types
 */
export const DEBT_TYPE_LABELS: Record<(typeof DEBT_TYPES)[number], string> = {
  mortgage: "Mortgage",
  heloc: "HELOC",
  car_loan: "Car Loan",
  student_loan: "Student Loan",
  personal_loan: "Personal Loan",
  credit_card: "Credit Card",
  line_of_credit: "Line of Credit",
  business_loan: "Business Loan",
  other: "Other",
};

/**
 * Debt type options for use in select components
 */
export const DEBT_TYPE_OPTIONS = DEBT_TYPES.map((value) => ({
  value,
  label: DEBT_TYPE_LABELS[value],
}));

/**
 * Validation schema for debt type enum
 */
export const debtTypeSchema = z.enum(DEBT_TYPES);

/**
 * Validation schema for current balance
 * Kept as string to match database schema and avoid unnecessary conversions
 */
export const currentBalanceSchema = z.string().refine(
  (val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  },
  { message: "Current balance must be a valid positive number" },
);

/**
 * Validation schema for creating a debt
 */
export const createDebtSchema = z
  .object({
    name: z.string().min(1, "Debt name is required").max(255),
    type: debtTypeSchema,
    currentBalance: currentBalanceSchema,
  })
  .strict();

/**
 * Validation schema for updating a debt
 */
export const updateDebtSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    type: debtTypeSchema.optional(),
    currentBalance: currentBalanceSchema.optional(),
  })
  .strict();
