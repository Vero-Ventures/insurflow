/**
 * @fileoverview Unit tests for POST /api/carriers/webhook route.
 *
 * Tests the webhook endpoint's handling of provider resolution, verification
 * delegation, persistence, idempotency, and error responses.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Mock Setup
// ============================================================================

const mockVerifyWebhook = vi.fn();
const mockGetCarrierProvider = vi.fn();
const mockListProviderIds = vi.fn();
const mockPersistWebhookEvent = vi.fn();

vi.mock("@/lib/providers/carrier-registry", () => ({
  getCarrierProvider: (...args: unknown[]) => mockGetCarrierProvider(...args),
  listProviderIds: () => mockListProviderIds(),
}));

vi.mock("@/lib/api/webhook-helpers", () => ({
  persistWebhookEvent: (...args: unknown[]) => mockPersistWebhookEvent(...args),
}));

vi.mock("@/server/axiom", () => ({
  createLogger: vi.fn(() => ({
    addContext: vi.fn(),
    info: vi.fn(async () => undefined),
    warn: vi.fn(async () => undefined),
    error: vi.fn(async () => undefined),
  })),
}));

// ============================================================================
// Helpers
// ============================================================================

const TEST_CLIENT_ID = "550e8400-e29b-41d4-a716-446655440001";

function createMockProvider() {
  return {
    providerId: "mock",
    verifyWebhook: mockVerifyWebhook,
  };
}

function validPayload() {
  return {
    eventId: "evt_001",
    clientId: TEST_CLIENT_ID,
    status: "in_review",
    timestamp: "2025-06-15T10:30:00Z",
    metadata: { note: "test" },
  };
}

async function postWebhook(
  provider: string | null,
  body?: string | object,
  headers?: Record<string, string>,
) {
  const { POST } = await import("../route");

  const url = provider
    ? `http://localhost/api/carriers/webhook?provider=${provider}`
    : "http://localhost/api/carriers/webhook";

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  let requestBody: string | undefined;
  if (body === undefined) {
    requestBody = undefined;
  } else if (typeof body === "string") {
    requestBody = body;
  } else {
    requestBody = JSON.stringify(body);
  }

  return POST(
    new Request(url, {
      method: "POST",
      headers: requestHeaders,
      body: requestBody,
    }),
  );
}

// ============================================================================
// Tests
// ============================================================================

describe("POST /api/carriers/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: "mock" is a valid provider
    mockListProviderIds.mockReturnValue(["mock"]);
    mockGetCarrierProvider.mockReturnValue(createMockProvider());
  });

  // --------------------------------------------------------------------------
  // Input validation
  // --------------------------------------------------------------------------

  it("returns 400 when provider query param is missing", async () => {
    const response = await postWebhook(null, validPayload());

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Invalid or unknown provider");
  });

  it("returns 400 for unknown provider", async () => {
    // "unknown_carrier" is not in the allowlist
    const response = await postWebhook("unknown_carrier", validPayload());

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Invalid or unknown provider");
  });

  it("returns 401 for empty body (verification fails)", async () => {
    // Empty body is passed to verifyWebhook which should fail signature verification
    mockVerifyWebhook.mockResolvedValue({
      success: false,
      error: "Missing signature header",
      statusCode: 401,
    });

    const response = await postWebhook("mock", "");

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain("Missing signature");
  });

  it("returns 400 for invalid JSON (malformed payload)", async () => {
    // Invalid JSON is passed to verifyWebhook which should return 400 for malformed input
    mockVerifyWebhook.mockResolvedValue({
      success: false,
      error: "Invalid JSON body",
      statusCode: 400,
    });

    const response = await postWebhook("mock", "{not-json}");

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Invalid JSON");
  });

  // --------------------------------------------------------------------------
  // Verification failures
  // --------------------------------------------------------------------------

  it("returns 401 when signature verification fails", async () => {
    mockVerifyWebhook.mockResolvedValue({
      success: false,
      error: "Invalid signature",
      statusCode: 401,
    });

    const response = await postWebhook("mock", validPayload(), {
      "x-mock-signature": "bad-sig",
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain("Invalid signature");
  });

  it("returns 400 when payload validation fails", async () => {
    mockVerifyWebhook.mockResolvedValue({
      success: false,
      error: "Invalid payload: clientId must be a valid UUID",
      statusCode: 400,
    });

    const response = await postWebhook(
      "mock",
      { ...validPayload(), clientId: "not-a-uuid" },
      { "x-mock-signature": "valid-sig" },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Invalid payload");
  });

  // --------------------------------------------------------------------------
  // Successful processing
  // --------------------------------------------------------------------------

  it("returns 200 with accepted:true for new events", async () => {
    mockVerifyWebhook.mockResolvedValue({
      success: true,
      event: {
        clientId: TEST_CLIENT_ID,
        providerEventId: "evt_001",
        status: "in_review",
        eventTimestamp: new Date("2025-06-15T10:30:00Z"),
        metadata: { note: "test" },
      },
    });
    mockPersistWebhookEvent.mockResolvedValue({
      persisted: true,
      duplicate: false,
      statusUpdated: true,
    });

    const response = await postWebhook("mock", validPayload(), {
      "x-mock-signature": "valid-sig",
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.accepted).toBe(true);
    expect(body.duplicate).toBe(false);
    expect(body.statusUpdated).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Idempotency
  // --------------------------------------------------------------------------

  it("returns 200 with duplicate:true for duplicate events", async () => {
    mockVerifyWebhook.mockResolvedValue({
      success: true,
      event: {
        clientId: TEST_CLIENT_ID,
        providerEventId: "evt_001",
        status: "in_review",
        eventTimestamp: new Date("2025-06-15T10:30:00Z"),
        metadata: null,
      },
    });
    mockPersistWebhookEvent.mockResolvedValue({
      persisted: false,
      duplicate: true,
      statusUpdated: false,
    });

    const response = await postWebhook("mock", validPayload(), {
      "x-mock-signature": "valid-sig",
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.accepted).toBe(true);
    expect(body.duplicate).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Persistence errors
  // --------------------------------------------------------------------------

  it("returns 422 when client not found during persistence", async () => {
    mockVerifyWebhook.mockResolvedValue({
      success: true,
      event: {
        clientId: TEST_CLIENT_ID,
        providerEventId: "evt_001",
        status: "in_review",
        eventTimestamp: new Date("2025-06-15T10:30:00Z"),
        metadata: null,
      },
    });
    mockPersistWebhookEvent.mockResolvedValue({
      persisted: false,
      duplicate: false,
      error: "Client not found",
      statusUpdated: false,
    });

    const response = await postWebhook("mock", validPayload(), {
      "x-mock-signature": "valid-sig",
    });

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe("Client not found");
  });

  // --------------------------------------------------------------------------
  // Internal errors
  // --------------------------------------------------------------------------

  it("returns 500 on unexpected errors", async () => {
    mockVerifyWebhook.mockRejectedValue(new Error("Unexpected DB error"));

    const response = await postWebhook("mock", validPayload(), {
      "x-mock-signature": "valid-sig",
    });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Internal server error");
  });

  // --------------------------------------------------------------------------
  // Provider delegation
  // --------------------------------------------------------------------------

  it("delegates to the correct provider's verifyWebhook", async () => {
    mockVerifyWebhook.mockResolvedValue({
      success: true,
      event: {
        clientId: TEST_CLIENT_ID,
        providerEventId: "evt_001",
        status: "received",
        eventTimestamp: new Date("2025-06-15T10:30:00Z"),
        metadata: null,
      },
    });
    mockPersistWebhookEvent.mockResolvedValue({
      persisted: true,
      duplicate: false,
      statusUpdated: true,
    });

    await postWebhook("mock", validPayload(), {
      "x-mock-signature": "valid-sig",
    });

    expect(mockGetCarrierProvider).toHaveBeenCalledWith("mock");
    expect(mockVerifyWebhook).toHaveBeenCalledTimes(1);
    expect(mockPersistWebhookEvent).toHaveBeenCalledWith(
      "mock",
      expect.objectContaining({
        clientId: TEST_CLIENT_ID,
        providerEventId: "evt_001",
      }),
    );
  });
});
