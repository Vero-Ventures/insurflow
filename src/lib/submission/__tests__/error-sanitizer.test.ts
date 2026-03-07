/**
 * @fileoverview Tests for error sanitization utilities.
 *
 * Covers:
 * - User-facing error messages are safe and actionable
 * - Audit metadata does not contain PII
 * - Known error codes map to correct messages
 * - PII fields are stripped from audit context
 *
 * @see Issue #271
 */

import { describe, expect, it } from "vitest";

import {
  sanitizeErrorForAudit,
  sanitizeUserError,
  type SubmissionErrorCode,
} from "../error-sanitizer";

// ============================================================================
// sanitizeUserError
// ============================================================================

describe("sanitizeUserError", () => {
  const codes: SubmissionErrorCode[] = [
    "ALREADY_SUBMITTED",
    "SUBMISSION_IN_PROGRESS",
    "PROVIDER_UNAVAILABLE",
    "VALIDATION_FAILED",
    "INTERNAL_ERROR",
  ];

  it("returns a SanitizedError with code and userMessage for every code", () => {
    for (const code of codes) {
      const result = sanitizeUserError(code);
      expect(result.code).toBe(code);
      expect(typeof result.userMessage).toBe("string");
      expect(result.userMessage.length).toBeGreaterThan(10);
    }
  });

  it("user messages do not contain technical details", () => {
    for (const code of codes) {
      const msg = sanitizeUserError(code).userMessage;
      // Should not contain stack trace patterns, error codes, or technical jargon
      expect(msg).not.toMatch(/stack|trace|Error:|TypeError|null|undefined/i);
      expect(msg).not.toMatch(/\d{3,}/); // No HTTP codes or error numbers
    }
  });

  it("ALREADY_SUBMITTED message directs user to dashboard", () => {
    const result = sanitizeUserError("ALREADY_SUBMITTED");
    expect(result.userMessage).toContain("dashboard");
  });

  it("PROVIDER_UNAVAILABLE message suggests retrying", () => {
    const result = sanitizeUserError("PROVIDER_UNAVAILABLE");
    expect(result.userMessage).toContain("try again");
  });
});

// ============================================================================
// sanitizeErrorForAudit
// ============================================================================

describe("sanitizeErrorForAudit", () => {
  it("extracts safe fields from Error objects", () => {
    const error = new Error("Connection refused");
    const result = sanitizeErrorForAudit(error);

    expect(result.errorName).toBe("Error");
    expect(result.errorCategory).toBe("network_error");
    expect(result).not.toHaveProperty("errorMessage");
  });

  it("extracts status codes from error objects", () => {
    const error = Object.assign(new Error("Server error"), {
      statusCode: 500,
    });
    const result = sanitizeErrorForAudit(error);

    expect(result.statusCode).toBe(500);
    expect(result.errorCategory).toBe("server_error");
  });

  it("never includes raw error messages in audit output", () => {
    const error = new Error(
      "PostgreSQL connection refused at 10.0.0.1:5432 for user admin",
    );
    const result = sanitizeErrorForAudit(error);

    expect(result).not.toHaveProperty("errorMessage");
    expect(result.errorCategory).toBe("network_error");
  });

  it("classifies timeout errors", () => {
    const error = new Error("ETIMEDOUT");
    const result = sanitizeErrorForAudit(error);

    expect(result.errorCategory).toBe("timeout");
    expect(result).not.toHaveProperty("errorMessage");
  });

  it("classifies client errors by status code", () => {
    const error = Object.assign(new Error("Bad request"), { statusCode: 400 });
    const result = sanitizeErrorForAudit(error);

    expect(result.errorCategory).toBe("client_error");
    expect(result).not.toHaveProperty("errorMessage");
  });

  it("handles string errors without exposing raw content", () => {
    const result = sanitizeErrorForAudit("raw error string with PII data");

    expect(result).not.toHaveProperty("errorMessage");
    expect(result.errorCategory).toBe("unknown");
  });

  it("merges safe context fields", () => {
    const error = new Error("fail");
    const result = sanitizeErrorForAudit(error, {
      providerKey: "mock",
      attempts: 3,
    });

    expect(result.providerKey).toBe("mock");
    expect(result.attempts).toBe(3);
  });

  it("strips PII fields from context", () => {
    const error = new Error("fail");
    const result = sanitizeErrorForAudit(error, {
      providerKey: "mock",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      address: "123 Main St",
      phone: "555-1234",
      ssn: "123-45-6789",
      date_of_birth: "1990-01-01",
      password: "test_password",
      token: "abc123",
      payload: '{"raw": "data"}',
      rawBody: '{"sensitive": true}',
    });

    // Safe fields preserved
    expect(result.providerKey).toBe("mock");

    // PII fields stripped
    expect(result).not.toHaveProperty("firstName");
    expect(result).not.toHaveProperty("lastName");
    expect(result).not.toHaveProperty("email");
    expect(result).not.toHaveProperty("address");
    expect(result).not.toHaveProperty("phone");
    expect(result).not.toHaveProperty("ssn");
    expect(result).not.toHaveProperty("date_of_birth");
    expect(result).not.toHaveProperty("password");
    expect(result).not.toHaveProperty("token");
    expect(result).not.toHaveProperty("payload");
    expect(result).not.toHaveProperty("rawBody");
  });

  it("handles non-Error, non-string values gracefully", () => {
    const result = sanitizeErrorForAudit(42);
    expect(result).toBeDefined();
    // Should not throw, returns empty-ish object
  });

  it("handles null/undefined context", () => {
    const result = sanitizeErrorForAudit(new Error("test"), undefined);
    expect(result.errorName).toBe("Error");
  });
});
