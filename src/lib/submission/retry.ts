/**
 * @fileoverview Retry utility for transient provider failures.
 *
 * Provides a generic retry wrapper with exponential backoff and jitter,
 * plus a classifier to distinguish transient errors (worth retrying) from
 * permanent ones (should fail immediately).
 *
 * @see Issue #271
 */

// ============================================================================
// Types
// ============================================================================

export interface RetryOptions {
  /** Maximum number of retry attempts (not counting the initial call). Default: 2 */
  maxRetries?: number;
  /** Base delay in milliseconds before the first retry. Default: 500 */
  baseDelayMs?: number;
  /** Maximum delay cap in milliseconds. Default: 5000 */
  maxDelayMs?: number;
  /** Predicate that returns true if the error is transient and worth retrying. */
  isRetryable?: (error: unknown) => boolean;
}

export interface RetryResult<T> {
  ok: true;
  value: T;
  attempts: number;
}

export interface RetryFailure {
  ok: false;
  error: unknown;
  attempts: number;
  /** True if all retries were exhausted on transient errors. */
  exhausted: boolean;
}

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 5_000;

// ============================================================================
// Transient error classification
// ============================================================================

/**
 * Determines whether an error is transient and worth retrying.
 *
 * Transient errors include:
 * - Network errors (fetch failures, timeouts, connection resets)
 * - Server errors (HTTP 5xx)
 * - Explicit timeout errors
 *
 * Permanent errors (NOT retried):
 * - Validation errors (HTTP 4xx)
 * - Authentication/authorization errors
 * - Business rule violations
 */
export function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    // Network/fetch failures
    if (msg.includes("fetch failed") || msg.includes("network")) return true;
    if (msg.includes("econnrefused") || msg.includes("econnreset")) return true;
    if (msg.includes("etimedout") || msg.includes("timeout")) return true;
    if (msg.includes("socket hang up")) return true;

    // Explicitly marked transient errors
    if ("transient" in error && (error as { transient: boolean }).transient) {
      return true;
    }

    // HTTP status code on error object
    if ("statusCode" in error) {
      const code = (error as { statusCode: number }).statusCode;
      return code >= 500 && code < 600;
    }
    if ("status" in error) {
      const code = (error as { status: number }).status;
      return code >= 500 && code < 600;
    }
  }

  return false;
}

// ============================================================================
// Retry with backoff
// ============================================================================

/**
 * Executes an async function with retry logic for transient failures.
 *
 * Uses exponential backoff with jitter to avoid thundering herd.
 * Only retries errors classified as transient by the isRetryable predicate.
 * Permanent errors fail immediately without consuming retry budget.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<RetryResult<T> | RetryFailure> {
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = options?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const isRetryable = options?.isRetryable ?? isTransientError;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const value = await fn();
      return { ok: true, value, attempts: attempt };
    } catch (error) {
      lastError = error;

      // Permanent error — fail immediately
      if (!isRetryable(error)) {
        return { ok: false, error, attempts: attempt, exhausted: false };
      }

      // Transient error — retry if budget remains
      if (attempt <= maxRetries) {
        const delay = Math.min(
          baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * baseDelayMs,
          maxDelayMs,
        );
        await sleep(delay);
      }
    }
  }

  return {
    ok: false,
    error: lastError,
    attempts: maxRetries + 1,
    exhausted: true,
  };
}

/** Internal sleep helper — exported only for testing. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
