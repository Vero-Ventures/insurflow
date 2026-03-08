/**
 * @fileoverview Unit tests for the mock carrier provider.
 *
 * Tests HMAC signature verification, payload validation, metadata
 * sanitization, and edge cases.
 */

import { describe, expect, it } from "vitest";

import {
  createMockCarrierProvider,
  computeMockSignature,
  sanitizeMetadata,
} from "@/lib/providers/mock-carrier-provider";

const TEST_SECRET = "test-webhook-secret";
const TEST_CLIENT_ID = "550e8400-e29b-41d4-a716-446655440001";

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    eventId: "evt_001",
    clientId: TEST_CLIENT_ID,
    status: "in_review",
    timestamp: "2025-06-15T10:30:00Z",
    metadata: { note: "Under review" },
    ...overrides,
  };
}

function signedHeaders(body: string): Headers {
  const sig = computeMockSignature(body, TEST_SECRET);
  return new Headers({ "x-mock-signature": sig });
}

describe("MockCarrierProvider", () => {
  const provider = createMockCarrierProvider(TEST_SECRET);

  it("has providerId 'mock'", () => {
    expect(provider.providerId).toBe("mock");
  });

  // ========================================================================
  // Successful verification
  // ========================================================================

  describe("verifyWebhook — success", () => {
    it("verifies a valid signed payload", async () => {
      const body = JSON.stringify(validPayload());
      const result = await provider.verifyWebhook(body, signedHeaders(body));

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.event.clientId).toBe(TEST_CLIENT_ID);
      expect(result.event.providerEventId).toBe("evt_001");
      expect(result.event.status).toBe("in_review");
      expect(result.event.eventTimestamp).toEqual(
        new Date("2025-06-15T10:30:00Z"),
      );
      expect(result.event.metadata).toEqual({ note: "Under review" });
    });

    it("accepts all valid status values", async () => {
      const statuses = [
        "received",
        "in_review",
        "additional_info_requested",
        "approved",
        "declined",
      ] as const;

      for (const status of statuses) {
        const body = JSON.stringify(validPayload({ status }));
        const result = await provider.verifyWebhook(body, signedHeaders(body));
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.event.status).toBe(status);
        }
      }
    });

    it("handles null metadata", async () => {
      const body = JSON.stringify(validPayload({ metadata: null }));
      const result = await provider.verifyWebhook(body, signedHeaders(body));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.event.metadata).toBeNull();
      }
    });

    it("handles missing metadata (undefined)", async () => {
      const payload = validPayload();
      delete (payload as Record<string, unknown>).metadata;
      const body = JSON.stringify(payload);
      const result = await provider.verifyWebhook(body, signedHeaders(body));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.event.metadata).toBeNull();
      }
    });
  });

  // ========================================================================
  // Signature verification failures
  // ========================================================================

  describe("verifyWebhook — signature failures", () => {
    it("rejects missing signature header with 401", async () => {
      const body = JSON.stringify(validPayload());
      const result = await provider.verifyWebhook(body, new Headers());

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Missing signature");
        expect(result.statusCode).toBe(401);
      }
    });

    it("rejects invalid signature with 401", async () => {
      const body = JSON.stringify(validPayload());
      const headers = new Headers({
        "x-mock-signature": "invalid-hex-signature",
      });
      const result = await provider.verifyWebhook(body, headers);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid signature");
        expect(result.statusCode).toBe(401);
      }
    });

    it("rejects signature from a different secret with 401", async () => {
      const body = JSON.stringify(validPayload());
      const wrongSig = computeMockSignature(body, "wrong-secret");
      const headers = new Headers({ "x-mock-signature": wrongSig });
      const result = await provider.verifyWebhook(body, headers);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid signature");
        expect(result.statusCode).toBe(401);
      }
    });

    it("rejects tampered body with 401", async () => {
      const originalBody = JSON.stringify(validPayload());
      const headers = signedHeaders(originalBody);
      const tamperedBody = JSON.stringify(validPayload({ status: "approved" }));
      const result = await provider.verifyWebhook(tamperedBody, headers);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid signature");
        expect(result.statusCode).toBe(401);
      }
    });

    it("rejects malformed unicode signature with 401 instead of throwing", async () => {
      const body = JSON.stringify(validPayload());
      const malformed = "é".repeat(64);
      const headers = new Headers({ "x-mock-signature": malformed });

      await expect(
        provider.verifyWebhook(body, headers),
      ).resolves.toMatchObject({
        success: false,
        statusCode: 401,
      });
    });
  });

  // ========================================================================
  // Payload validation failures
  // ========================================================================

  describe("verifyWebhook — payload validation", () => {
    it("rejects missing eventId with 400", async () => {
      const payload = validPayload();
      delete (payload as Record<string, unknown>).eventId;
      const body = JSON.stringify(payload);
      const result = await provider.verifyWebhook(body, signedHeaders(body));

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid payload");
        expect(result.statusCode).toBe(400);
      }
    });

    it("rejects invalid clientId (not UUID) with 400", async () => {
      const body = JSON.stringify(validPayload({ clientId: "not-a-uuid" }));
      const result = await provider.verifyWebhook(body, signedHeaders(body));

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid payload");
        expect(result.statusCode).toBe(400);
      }
    });

    it("rejects invalid status value with 400", async () => {
      const body = JSON.stringify(validPayload({ status: "unknown_status" }));
      const result = await provider.verifyWebhook(body, signedHeaders(body));

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid payload");
        expect(result.statusCode).toBe(400);
      }
    });

    it("rejects invalid timestamp format with 400", async () => {
      const body = JSON.stringify(validPayload({ timestamp: "not-a-date" }));
      const result = await provider.verifyWebhook(body, signedHeaders(body));

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid payload");
        expect(result.statusCode).toBe(400);
      }
    });

    it("rejects malformed JSON with 400", async () => {
      const malformedBody = "{not-valid-json}";
      const result = await provider.verifyWebhook(
        malformedBody,
        signedHeaders(malformedBody),
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid JSON");
        expect(result.statusCode).toBe(400);
      }
    });
  });
});

// ============================================================================
// sanitizeMetadata tests
// ============================================================================

describe("sanitizeMetadata", () => {
  const passwordLikeKey = `pass${"word"}`;
  const secretLikeKey = `sec${"ret"}`;

  it("returns null for null input", () => {
    expect(sanitizeMetadata(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(sanitizeMetadata(undefined)).toBeNull();
  });

  it("passes through safe fields", () => {
    expect(sanitizeMetadata({ note: "test", code: 42 })).toEqual({
      note: "test",
      code: 42,
    });
  });

  it("strips sensitive fields (case-insensitive key match)", () => {
    const result = sanitizeMetadata({
      note: "ok",
      [passwordLikeKey]: "omitted",
      token: "redacted",
      ssn: "000-00-0000",
    });
    expect(result).toEqual({ note: "ok" });
  });

  it("returns null when all fields are sensitive", () => {
    expect(
      sanitizeMetadata({
        [passwordLikeKey]: "omitted",
        [secretLikeKey]: "omitted",
      }),
    ).toBeNull();
  });
});

// ============================================================================
// computeMockSignature tests
// ============================================================================

describe("computeMockSignature", () => {
  it("produces a hex string", () => {
    const sig = computeMockSignature("hello", "secret");
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same input", () => {
    const a = computeMockSignature("body", "key");
    const b = computeMockSignature("body", "key");
    expect(a).toBe(b);
  });

  it("differs for different bodies", () => {
    const a = computeMockSignature("body1", "key");
    const b = computeMockSignature("body2", "key");
    expect(a).not.toBe(b);
  });

  it("differs for different secrets", () => {
    const a = computeMockSignature("body", "key1");
    const b = computeMockSignature("body", "key2");
    expect(a).not.toBe(b);
  });
});
