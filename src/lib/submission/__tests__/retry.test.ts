/**
 * @fileoverview Tests for the retry utility.
 *
 * Covers:
 * - Successful execution on first attempt
 * - Retry on transient errors with eventual success
 * - Retry exhaustion on persistent transient errors
 * - Immediate failure on permanent errors (no retry)
 * - Transient error classification
 *
 * @see Issue #271
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isTransientError, withRetry } from "../retry";

// ============================================================================
// isTransientError
// ============================================================================

describe("isTransientError", () => {
  it("classifies network errors as transient", () => {
    expect(isTransientError(new Error("fetch failed"))).toBe(true);
    expect(isTransientError(new Error("network error occurred"))).toBe(true);
    expect(isTransientError(new Error("ECONNREFUSED"))).toBe(true);
    expect(isTransientError(new Error("ECONNRESET"))).toBe(true);
    expect(isTransientError(new Error("ETIMEDOUT"))).toBe(true);
    expect(isTransientError(new Error("socket hang up"))).toBe(true);
  });

  it("classifies timeout errors as transient", () => {
    expect(isTransientError(new Error("request timeout"))).toBe(true);
  });

  it("classifies 5xx status codes as transient", () => {
    const err = Object.assign(new Error("Server error"), { statusCode: 500 });
    expect(isTransientError(err)).toBe(true);

    const err503 = Object.assign(new Error("Unavailable"), { status: 503 });
    expect(isTransientError(err503)).toBe(true);
  });

  it("classifies errors with transient flag as transient", () => {
    const err = Object.assign(new Error("temp failure"), { transient: true });
    expect(isTransientError(err)).toBe(true);
  });

  it("classifies generic errors as permanent", () => {
    expect(isTransientError(new Error("validation failed"))).toBe(false);
    expect(isTransientError(new Error("invalid input"))).toBe(false);
  });

  it("classifies 4xx status codes as permanent", () => {
    const err = Object.assign(new Error("Bad request"), { statusCode: 400 });
    expect(isTransientError(err)).toBe(false);

    const err422 = Object.assign(new Error("Unprocessable"), { status: 422 });
    expect(isTransientError(err422)).toBe(false);
  });

  it("classifies non-Error values as permanent", () => {
    expect(isTransientError("string error")).toBe(false);
    expect(isTransientError(null)).toBe(false);
    expect(isTransientError(undefined)).toBe(false);
    expect(isTransientError(42)).toBe(false);
  });
});

// ============================================================================
// withRetry
// ============================================================================

describe("withRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Helper that runs withRetry and advances fake timers for each retry delay.
   * This prevents tests from waiting for real setTimeout delays.
   */
  async function runWithTimers<T>(
    retryPromise: Promise<T>,
    maxRetries: number,
  ): Promise<T> {
    // Advance timers for each potential retry
    for (let i = 0; i < maxRetries; i++) {
      await vi.advanceTimersByTimeAsync(10_000);
    }
    return retryPromise;
  }

  it("succeeds on first attempt without retrying", async () => {
    const fn = vi.fn().mockResolvedValue("success");

    const promise = withRetry(fn, { maxRetries: 2 });
    const result = await runWithTimers(promise, 2);

    expect(result).toEqual({ ok: true, value: "success", attempts: 1 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on transient error and succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValue("recovered");

    const promise = withRetry(fn, { maxRetries: 2 });
    const result = await runWithTimers(promise, 2);

    expect(result).toEqual({ ok: true, value: "recovered", attempts: 2 });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("exhausts retries on persistent transient errors", async () => {
    const transientError = new Error("ECONNRESET");
    const fn = vi.fn().mockRejectedValue(transientError);

    const promise = withRetry(fn, { maxRetries: 2 });
    const result = await runWithTimers(promise, 2);

    expect(result).toEqual({
      ok: false,
      error: transientError,
      attempts: 3,
      exhausted: true,
    });
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it("does NOT retry permanent errors", async () => {
    const permanentError = new Error("validation failed");
    const fn = vi.fn().mockRejectedValue(permanentError);

    const promise = withRetry(fn, { maxRetries: 2 });
    const result = await runWithTimers(promise, 2);

    expect(result).toEqual({
      ok: false,
      error: permanentError,
      attempts: 1,
      exhausted: false,
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry 4xx errors", async () => {
    const clientError = Object.assign(new Error("Bad request"), {
      statusCode: 400,
    });
    const fn = vi.fn().mockRejectedValue(clientError);

    const promise = withRetry(fn, { maxRetries: 2 });
    const result = await runWithTimers(promise, 2);

    expect(result).toEqual({
      ok: false,
      error: clientError,
      attempts: 1,
      exhausted: false,
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("uses custom isRetryable predicate", async () => {
    const error = new Error("custom retryable");
    const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValue("ok");

    const promise = withRetry(fn, {
      maxRetries: 1,
      isRetryable: () => true,
    });
    const result = await runWithTimers(promise, 1);

    expect(result).toEqual({ ok: true, value: "ok", attempts: 2 });
  });

  it("defaults to maxRetries=2 when not specified", async () => {
    const transientError = new Error("timeout");
    const fn = vi.fn().mockRejectedValue(transientError);

    const promise = withRetry(fn);
    const result = await runWithTimers(promise, 2);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.attempts).toBe(3);
      expect(result.exhausted).toBe(true);
    }
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
