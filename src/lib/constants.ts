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
