/**
 * @fileoverview Error sanitization for user-facing submission errors.
 *
 * Ensures users see actionable, non-technical messages while raw error
 * details remain in internal logs only. No PII is ever included in
 * sanitized output.
 *
 * @see Issue #271
 */

// ============================================================================
// Types
// ============================================================================

export interface SanitizedError {
  /** Safe, user-facing message. Never contains raw error details or PII. */
  userMessage: string;
  /** Machine-readable error code for programmatic handling. */
  code: SubmissionErrorCode;
}

export type SubmissionErrorCode =
  | "ALREADY_SUBMITTED"
  | "SUBMISSION_IN_PROGRESS"
  | "PROVIDER_UNAVAILABLE"
  | "VALIDATION_FAILED"
  | "INTERNAL_ERROR";

// ============================================================================
// User-facing messages
// ============================================================================

const USER_MESSAGES: Record<SubmissionErrorCode, string> = {
  ALREADY_SUBMITTED:
    "Your application has already been submitted. You can track its status from your dashboard.",
  SUBMISSION_IN_PROGRESS:
    "Your application is currently being processed. Please wait a moment and check your dashboard.",
  PROVIDER_UNAVAILABLE:
    "We were unable to reach the insurance provider. Please try again in a few minutes.",
  VALIDATION_FAILED:
    "Some application details could not be validated. Please review your information and try again.",
  INTERNAL_ERROR:
    "Something went wrong while processing your application. Please try again or contact support.",
};

// ============================================================================
// Sanitization
// ============================================================================

/**
 * Returns a safe, user-facing error message for a given error code.
 * Never exposes raw error details, stack traces, or PII.
 */
export function sanitizeUserError(code: SubmissionErrorCode): SanitizedError {
  return {
    userMessage: USER_MESSAGES[code],
    code,
  };
}

/**
 * Produces sanitized metadata suitable for audit logging.
 *
 * Strips PII fields (names, emails, addresses, SSNs, phone numbers, raw payloads)
 * and returns only safe operational data.
 */
export function sanitizeErrorForAudit(
  error: unknown,
  context?: Record<string, unknown>,
): Record<string, unknown> {
  const safe: Record<string, unknown> = {};

  if (error instanceof Error) {
    safe.errorName = error.name;
    safe.errorCategory = classifyError(error);

    if ("statusCode" in error) {
      safe.statusCode = (error as { statusCode: number }).statusCode;
    }
    if ("status" in error) {
      safe.status = (error as { status: number }).status;
    }
    if ("code" in error) {
      safe.errorCode = (error as { code: string }).code;
    }
  } else if (typeof error === "string") {
    safe.errorCategory = "unknown";
  }

  // Merge safe context, stripping known PII field names
  if (context) {
    for (const [key, value] of Object.entries(context)) {
      if (!isPiiField(key)) {
        safe[key] = value;
      }
    }
  }

  return safe;
}

// ============================================================================
// Error classification
// ============================================================================

/**
 * Classifies an error into a safe operational category.
 * Never exposes raw error messages — returns a canonical string only.
 */
function classifyError(error: Error): string {
  const msg = error.message.toLowerCase();

  if (
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("connection refused") ||
    msg.includes("fetch failed") ||
    msg.includes("network")
  ) {
    return "network_error";
  }
  if (msg.includes("etimedout") || msg.includes("timeout")) {
    return "timeout";
  }
  if (msg.includes("socket hang up")) {
    return "connection_closed";
  }

  if ("statusCode" in error) {
    const code = (error as { statusCode: number }).statusCode;
    if (code >= 500) return "server_error";
    if (code >= 400) return "client_error";
  }
  if ("status" in error) {
    const code = (error as { status: number }).status;
    if (code >= 500) return "server_error";
    if (code >= 400) return "client_error";
  }

  return "unknown";
}

/** Fields that may contain PII and must never appear in audit metadata. */
const PII_FIELDS = new Set([
  "firstname",
  "lastname",
  "name",
  "email",
  "address",
  "phone",
  "ssn",
  "sin",
  "dateofbirth",
  "dob",
  "password",
  "secret",
  "token",
  "payload",
  "body",
  "rawpayload",
  "rawbody",
]);

function isPiiField(fieldName: string): boolean {
  return PII_FIELDS.has(fieldName.toLowerCase().replace(/[_-]/g, ""));
}
