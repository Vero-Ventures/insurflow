/**
 * Application-wide constants
 * Centralized configuration values to prevent magic numbers/strings scattered across the codebase
 */

// ============================================================================
// Locale & Currency
// ============================================================================

/** Default locale for formatting (US English) */
export const DEFAULT_LOCALE = "en-US";

/** Default currency code */
export const DEFAULT_CURRENCY = "USD";

// Pre-configured Intl formatters for performance (created once, reused everywhere)
const currencyFormatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
  style: "currency",
  currency: DEFAULT_CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
  style: "currency",
  currency: DEFAULT_CURRENCY,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Format a number as US currency
 */
export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

/**
 * Format a number as compact currency (no decimals)
 */
export function formatCurrencyCompact(amount: number): string {
  return compactCurrencyFormatter.format(amount);
}

/**
 * Format a date string to localized format
 */
export function formatDate(dateString: string | Date): string {
  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;
  return dateFormatter.format(date);
}

/**
 * Format a date string to localized format with time
 */
export function formatDateTime(dateString: string | Date): string {
  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;
  return dateTimeFormatter.format(date);
}

// ============================================================================
// Financial Defaults
// ============================================================================

/** Default income replacement percentage (70% of income) */
export const DEFAULT_INCOME_REPLACEMENT_PERCENT = 70;

/** Default duration for income replacement in years */
export const DEFAULT_REPLACEMENT_DURATION_YEARS = 10;

/** Default discount rate for present value calculations */
export const DEFAULT_DISCOUNT_RATE = 0.05;

/** Default inflation rate */
export const DEFAULT_INFLATION_RATE = 0.02;

/**
 * Default expense reduction percentage for expense-based mode (20%).
 * Represents the typical reduction in household expenses after the death
 * of the primary earner (one fewer person's direct costs: food, transport, etc.).
 */
export const DEFAULT_EXPENSE_REDUCTION_PERCENT = 0.2;

// ============================================================================
// Actuarial & Insurance Constants
// ============================================================================

/** Default term length for term life insurance (years) */
export const DEFAULT_TERM_LIFE_YEARS = 20;

/** Maximum term length for term life insurance (years) */
export const MAX_TERM_LIFE_YEARS = 40;

/** Actuarial discount rate for premium calculations (insurer's expected return) */
export const DEFAULT_ACTUARIAL_DISCOUNT_RATE = 0.04;

/** Minimum recommended coverage as multiplier of annual income */
export const MIN_COVERAGE_INCOME_MULTIPLIER = 5;

/** Target recommended coverage as multiplier of annual income */
export const TARGET_COVERAGE_INCOME_MULTIPLIER = 10;

/** Suggested insurance budget as percentage of income (10%) */
export const SUGGESTED_INSURANCE_BUDGET_PERCENT = 0.1;

/** Minimum insurable age */
export const MIN_INSURABLE_AGE = 18;

/** Maximum insurable age */
export const MAX_INSURABLE_AGE = 80;

// ============================================================================
// UI Constants
// ============================================================================

/** Duration to show copy feedback before resetting (ms) */
export const COPY_FEEDBACK_DURATION_MS = 2000;

/** Default debounce delay for search inputs (ms) */
export const SEARCH_DEBOUNCE_MS = 300;

/** Default pagination page size */
export const DEFAULT_PAGE_SIZE = 10;

// ============================================================================
// State Labels
// ============================================================================

import { STATES } from "@/lib/validation/client";

/** Human-readable labels for US state and Canadian province/territory codes */
export const STATE_LABELS: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "District of Columbia",
  // Canadian provinces and territories
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NS: "Nova Scotia",
  NT: "Northwest Territories",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon",
};

/** State options for dropdowns, derived from the canonical STATES array */
export const STATE_OPTIONS = STATES.map((code) => ({
  value: code,
  label: STATE_LABELS[code] ?? code,
}));

/** Canadian provinces and territories for Canada-first consumer onboarding UI */
export const CANADIAN_PROVINCE_TERRITORY_CODES = [
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

/** Province/territory dropdown options for Canada-first UI flows */
export const CANADIAN_PROVINCE_TERRITORY_OPTIONS =
  CANADIAN_PROVINCE_TERRITORY_CODES.map((code) => ({
    value: code,
    label: STATE_LABELS[code] ?? code,
  }));

// ---------------------------------------------------------------------------
// Canadian Province Type and Display Labels
// ---------------------------------------------------------------------------

/** String union of all 13 Canadian province/territory codes. */
export type CanadianProvince =
  | "AB" // Alberta
  | "BC" // British Columbia
  | "MB" // Manitoba
  | "NB" // New Brunswick
  | "NL" // Newfoundland and Labrador
  | "NS" // Nova Scotia
  | "NT" // Northwest Territories
  | "NU" // Nunavut
  | "ON" // Ontario
  | "PE" // Prince Edward Island
  | "QC" // Quebec
  | "SK" // Saskatchewan
  | "YT"; // Yukon

/** Display-label map for all Canadian provinces and territories. */
export const PROVINCE_NAMES: Record<CanadianProvince, string> = {
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NS: "Nova Scotia",
  NT: "Northwest Territories",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon",
};

/**
 * Get display label for state code
 */
export function getStateLabel(code: string | null | undefined): string {
  if (!code) return "";
  return STATE_LABELS[code] ?? code;
}

// ============================================================================
// Health Rating Labels
// ============================================================================

export const HEALTH_RATING_LABELS: Record<string, string> = {
  preferred_plus: "Preferred Plus",
  preferred: "Preferred",
  standard_plus: "Standard Plus",
  standard: "Standard",
  substandard: "Substandard",
};

/**
 * Get display label for health rating
 */
export function getHealthRatingLabel(
  rating: string | null | undefined,
): string {
  if (!rating) return "Standard";
  return HEALTH_RATING_LABELS[rating] || rating;
}
