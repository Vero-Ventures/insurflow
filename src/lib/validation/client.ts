import { z } from "zod";

/**
 * Canadian provinces/territories enum
 */
export const PROVINCES = [
  "AB",
  "BC",
  "MB",
  "NB",
  "NL",
  "NS",
  "NT",
  "NU",
  "ON",
  "PE",
  "QC",
  "SK",
  "YT",
] as const;

/**
 * Health rating options
 */
export const HEALTH_RATINGS = [
  "preferred_plus",
  "preferred",
  "standard_plus",
  "standard",
  "substandard",
] as const;

/**
 * Validates a date string is a valid date (not just format) and not in the future.
 * Uses UTC consistently to avoid timezone-related edge cases.
 */
export function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;

  // Parse the input date components
  const parts = dateStr.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  // Ensure all parts are valid numbers
  if (year === undefined || month === undefined || day === undefined) {
    return false;
  }

  // Validate structure: check that the parsed date matches the input components
  // This catches invalid dates like Feb 30 which JavaScript auto-corrects
  const isValidDateStructure =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  // Check if date is not in the future using UTC consistently
  const today = new Date();
  const todayUTC = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const inputUTC = Date.UTC(year, month - 1, day);

  return isValidDateStructure && inputUTC <= todayUTC;
}

/**
 * Decimal string validation - matches PostgreSQL decimal format.
 * Allows positive numbers with optional 2 decimal places.
 */
export const decimalString = (fieldName: string) =>
  z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, `Invalid ${fieldName} format`)
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      },
      { message: `${fieldName} must be a non-negative number` },
    );

/**
 * UUID validation regex
 */
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
