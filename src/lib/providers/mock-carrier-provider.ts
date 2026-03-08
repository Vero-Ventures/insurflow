/**
 * @fileoverview Mock carrier provider for development and testing.
 *
 * Implements CarrierProvider with HMAC-SHA256 signature verification and a
 * simple JSON payload format. This provider is gated to non-production
 * environments via the carrier registry.
 *
 * Payload format:
 * ```json
 * {
 *   "eventId": "evt_123",
 *   "clientId": "550e8400-...",
 *   "status": "in_review",
 *   "timestamp": "2025-01-15T10:30:00Z",
 *   "metadata": { "note": "Under review by underwriter" }
 * }
 * ```
 *
 * Signature: HMAC-SHA256 of the raw JSON body, sent in the
 * `x-mock-signature` header as a hex string.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import type {
  CarrierProvider,
  WebhookVerificationResult,
} from "./carrier-provider";

// ============================================================================
// CONSTANTS
// ============================================================================

const MOCK_PROVIDER_ID = "mock";
const SIGNATURE_HEADER = "x-mock-signature";

// ============================================================================
// PAYLOAD SCHEMA
// ============================================================================

const mockWebhookPayloadSchema = z.object({
  eventId: z.string().min(1, "eventId is required"),
  clientId: z.string().uuid("clientId must be a valid UUID"),
  status: z.enum([
    "draft",
    "submitted",
    "received",
    "in_review",
    "additional_info_requested",
    "approved",
    "declined",
  ]),
  timestamp: z.string().datetime({ message: "timestamp must be ISO 8601" }),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type MockWebhookPayload = z.infer<typeof mockWebhookPayloadSchema>;

// ============================================================================
// SIGNATURE HELPERS
// ============================================================================

/**
 * Compute HMAC-SHA256 signature for a given body string.
 * Exported for use in tests and manual trigger tooling.
 */
export function computeMockSignature(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

/**
 * Verify HMAC-SHA256 signature using timing-safe comparison.
 */
function verifySignature(
  body: string,
  signature: string,
  secret: string,
): boolean {
  if (!/^[0-9a-f]{64}$/i.test(signature)) {
    return false;
  }

  const expected = Buffer.from(computeMockSignature(body, secret), "hex");
  const provided = Buffer.from(signature, "hex");

  if (expected.length !== provided.length) {
    return false;
  }

  return timingSafeEqual(expected, provided);
}

// ============================================================================
// SANITIZATION
// ============================================================================

/** Fields that must be stripped from metadata before persistence */
const SENSITIVE_KEYS = new Set([
  "password",
  "secret",
  "token",
  "ssn",
  "sin",
  "social_security",
  "credit_card",
  "card_number",
]);

/**
 * Remove sensitive fields from metadata object.
 * Shallow check on top-level keys (matches existing audit sanitization rules).
 */
export function sanitizeMetadata(
  raw: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!raw) return null;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = value;
    }
  }
  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

// ============================================================================
// PROVIDER IMPLEMENTATION
// ============================================================================

/**
 * Create a mock carrier provider instance.
 *
 * @param secret - HMAC signing secret (typically from env var)
 */
export function createMockCarrierProvider(secret: string): CarrierProvider {
  return {
    providerId: MOCK_PROVIDER_ID,

    async verifyWebhook(
      body: unknown,
      headers: Headers,
    ): Promise<WebhookVerificationResult> {
      // 1. Extract signature header
      const signature = headers.get(SIGNATURE_HEADER);
      if (!signature) {
        return {
          success: false,
          error: "Missing signature header",
          statusCode: 401,
        };
      }

      // 2. Verify HMAC signature against raw body
      const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
      if (!verifySignature(bodyStr, signature, secret)) {
        return { success: false, error: "Invalid signature", statusCode: 401 };
      }

      // 3. Parse and validate payload
      let parsed: unknown;
      try {
        parsed = typeof body === "string" ? JSON.parse(body) : body;
      } catch {
        return { success: false, error: "Invalid JSON body", statusCode: 400 };
      }

      const result = mockWebhookPayloadSchema.safeParse(parsed);
      if (!result.success) {
        return {
          success: false,
          error: `Invalid payload: ${result.error.issues.map((i) => i.message).join(", ")}`,
          statusCode: 400,
        };
      }

      const payload = result.data;

      // 4. Return normalized event
      return {
        success: true,
        event: {
          clientId: payload.clientId,
          providerEventId: payload.eventId,
          status: payload.status,
          eventTimestamp: new Date(payload.timestamp),
          metadata: sanitizeMetadata(payload.metadata ?? null),
        },
      };
    },
  };
}
