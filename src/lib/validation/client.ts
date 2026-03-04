import { z } from "zod";

/**
 * US states, District of Columbia, and Canadian provinces/territories.
 * Must stay in sync with the `stateEnum` in enums-schema.ts.
 */
export const STATES = [
  // US states
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
  // Canadian provinces and territories
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
 * Validation constants for financial fields
 * MAX_MONEY_VALUE matches PostgreSQL decimal(14, 2) - max 12 digits before decimal
 */
export const MAX_MONEY_VALUE = 999_999_999_999.99; // ~1 trillion
export const MIN_CLIENT_AGE = 18;
export const MAX_CLIENT_AGE = 120;

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
 * Validates that a date of birth represents a person between MIN_CLIENT_AGE and MAX_CLIENT_AGE years old.
 * Insurance clients must be adults (18+) and realistically under 120.
 */
export function isValidClientAge(dateStr: string): boolean {
  const parts = dateStr.split("-");
  if (parts.length !== 3) {
    return false;
  }

  const year = parseInt(parts[0]!, 10);
  const month = parseInt(parts[1]!, 10);
  const day = parseInt(parts[2]!, 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return false;
  }

  const today = new Date();
  const birthDate = new Date(Date.UTC(year, month - 1, day));

  // Calculate age
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - birthDate.getUTCMonth();
  const dayDiff = today.getUTCDate() - birthDate.getUTCDate();

  // Adjust if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  return age >= MIN_CLIENT_AGE && age <= MAX_CLIENT_AGE;
}

/**
 * Decimal string validation - matches PostgreSQL decimal format.
 * Allows positive numbers with optional 2 decimal places.
 *
 * @param fieldName - Human-readable field name for error messages
 * @param maxValue - Optional maximum value (defaults to MAX_MONEY_VALUE)
 */
export const decimalString = (
  fieldName: string,
  maxValue: number = MAX_MONEY_VALUE,
) =>
  z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, `Invalid ${fieldName} format`)
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      },
      { message: `${fieldName} must be a non-negative number` },
    )
    .refine(
      (val) => {
        const num = parseFloat(val);
        return num <= maxValue;
      },
      {
        message: `${fieldName} must not exceed ${maxValue.toLocaleString()}`,
      },
    );

/**
 * UUID validation regex
 */
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
