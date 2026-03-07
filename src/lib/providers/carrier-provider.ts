/**
 * @fileoverview Carrier provider interface and types.
 *
 * Defines the contract that all carrier integrations must implement for:
 * - Premium estimation (D2C flow)
 * - Application submission
 * - Status polling
 * - Webhook verification and event normalization
 *
 * Each carrier has its own signing mechanism and payload format; the provider
 * abstraction isolates carrier-specific logic from the generic processing pipeline.
 */

import type { ApplicationStatus } from "@/server/db/schemas/applications-schema";

// ============================================================================
// ESTIMATION TYPES
// ============================================================================

export type PremiumRangeEstimate = {
  lowMonthlyPremiumCad: number;
  highMonthlyPremiumCad: number;
  currency: "CAD";
  nonBinding: true;
};

export type EstimateRangeInput = {
  age: number;
  tobaccoUse: boolean;
  province: string;
  termYears: number;
  coverageAmount: number;
};

// ============================================================================
// APPLICATION SUBMISSION TYPES
// ============================================================================

export type SubmitApplicationInput = {
  draftId: string;
  applicant: {
    firstName: string;
    lastName: string;
  };
};

export type SubmitApplicationResult = {
  submissionId: string;
  status: "submitted";
  submittedAt: string;
};

// ============================================================================
// STATUS POLLING TYPES
// ============================================================================

export type GetApplicationStatusInput = {
  submissionId: string;
};

export type ApplicationStatusResult = {
  submissionId: string;
  status: "submitted" | "in_review" | "approved" | "declined";
  events: Array<{
    status: "submitted" | "in_review" | "approved" | "declined";
    at: string;
    detail: string;
  }>;
};

// ============================================================================
// WEBHOOK VERIFICATION TYPES
// ============================================================================

/**
 * Normalized webhook event returned by a carrier provider after
 * successful verification and parsing.
 */
export interface NormalizedWebhookEvent {
  /** Client/application UUID this event applies to */
  clientId: string;
  /** Provider-assigned unique event ID (used for deduplication) */
  providerEventId: string;
  /** Normalized application status */
  status: ApplicationStatus;
  /** Carrier-reported event timestamp */
  eventTimestamp: Date;
  /** Sanitized metadata (carrier-specific, PII stripped) */
  metadata: Record<string, unknown> | null;
}

/**
 * Result of webhook verification. Either success with a normalized event,
 * or failure with an error reason and appropriate HTTP status code.
 *
 * Status codes:
 * - 400: Malformed payload (invalid JSON, missing fields, validation errors)
 * - 401: Authentication failure (invalid/missing signature)
 */
export type WebhookVerificationResult =
  | { success: true; event: NormalizedWebhookEvent }
  | { success: false; error: string; statusCode: 400 | 401 };

/**
 * Legacy webhook input type (for polling-based verification).
 * @deprecated Use verifyWebhook(body, headers) signature instead
 */
export type VerifyWebhookInput = {
  payload: string;
  signature: string | null | undefined;
};

/**
 * Legacy webhook result type (for polling-based verification).
 * @deprecated Use WebhookVerificationResult instead
 */
export type VerifyWebhookResult = {
  ok: boolean;
  providerEventId?: string;
};

// ============================================================================
// CARRIER PROVIDER INTERFACE
// ============================================================================

/**
 * Interface that every carrier integration must implement.
 *
 * Responsibilities:
 * - Provide premium estimates (non-binding)
 * - Submit applications to the carrier
 * - Poll for application status
 * - Verify authenticity of incoming webhook payloads (signature, HMAC, etc.)
 * - Parse carrier-specific payloads into normalized events
 * - Sanitize metadata (strip PII, secrets, sensitive fields)
 *
 * Implementations must be stateless and side-effect free.
 */
export interface CarrierProvider {
  /** Unique identifier for this provider (e.g., "mock", "manulife") */
  readonly providerId: string;

  /**
   * Get non-binding premium estimate range.
   * Optional - not all providers support this.
   */
  getEstimateRange?(input: EstimateRangeInput): Promise<PremiumRangeEstimate>;

  /**
   * Submit an application to the carrier.
   * Optional - not all providers support this.
   */
  submitApplication?(
    input: SubmitApplicationInput,
  ): Promise<SubmitApplicationResult>;

  /**
   * Poll for application status.
   * Optional - not all providers support this.
   */
  getApplicationStatus?(
    input: GetApplicationStatusInput,
  ): Promise<ApplicationStatusResult>;

  /**
   * Verify and parse an incoming webhook payload.
   *
   * @param body - Raw request body (string or parsed JSON)
   * @param headers - Request headers for signature verification
   * @returns Verification result with normalized event or error
   */
  verifyWebhook(
    body: unknown,
    headers: Headers,
  ): Promise<WebhookVerificationResult>;
}
