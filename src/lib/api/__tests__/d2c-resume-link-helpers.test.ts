/**
 * @fileoverview Unit tests for D2C resume link helper functions.
 *
 * Tests the pure functions and database operations for resume link
 * generation and verification.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  generateSecureToken,
  calculateExpiry,
  isLinkExpired,
  buildResumeUrl,
  createResumeLink,
  verifyResumeLink,
  markResumeLinkUsed,
} from "../d2c-resume-link-helpers";

import {
  createMockClient,
  createMockResumeLink,
  createExpiredResumeLink,
  createUsedResumeLink,
  createDbMocks,
  TEST_UUIDS,
} from "./helpers/d2c-resume-link-test-helpers";

import { RESUME_LINK_TTL_MS } from "@/lib/validation/d2c-resume-link";

// ============================================================================
// Mock Setup
// ============================================================================

const {
  mockClientFindFirst,
  mockResumeLinkFindFirst,
  mockInsert,
  mockUpdate,
  createMockDb,
} = createDbMocks();

vi.mock("@/server/db", () => ({
  getDb: vi.fn(() => createMockDb()),
}));

// ============================================================================
// Pure Function Tests (No Mocking Needed)
// ============================================================================

describe("generateSecureToken", () => {
  it("generates a 43-character URL-safe token", () => {
    const token = generateSecureToken();
    expect(token).toHaveLength(43);
    // URL-safe base64 characters only
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates unique tokens on each call", () => {
    const token1 = generateSecureToken();
    const token2 = generateSecureToken();
    const token3 = generateSecureToken();

    expect(token1).not.toBe(token2);
    expect(token2).not.toBe(token3);
    expect(token1).not.toBe(token3);
  });

  it("generates cryptographically strong tokens", () => {
    // Generate many tokens and check for statistical randomness
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateSecureToken());
    }
    // All should be unique
    expect(tokens.size).toBe(100);
  });
});

describe("calculateExpiry", () => {
  it("returns a date 24 hours from now by default", () => {
    const before = Date.now();
    const expiry = calculateExpiry();
    const after = Date.now();

    const expectedMin = before + RESUME_LINK_TTL_MS;
    const expectedMax = after + RESUME_LINK_TTL_MS;

    expect(expiry.getTime()).toBeGreaterThanOrEqual(expectedMin);
    expect(expiry.getTime()).toBeLessThanOrEqual(expectedMax);
  });

  it("calculates expiry from a specific date", () => {
    const startDate = new Date("2025-01-15T10:00:00Z");
    const expiry = calculateExpiry(startDate);

    const expected = new Date("2025-01-16T10:00:00Z");
    expect(expiry.getTime()).toBe(expected.getTime());
  });
});

describe("isLinkExpired", () => {
  it("returns false for future expiry dates", () => {
    const futureExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    expect(isLinkExpired(futureExpiry)).toBe(false);
  });

  it("returns true for past expiry dates", () => {
    const pastExpiry = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    expect(isLinkExpired(pastExpiry)).toBe(true);
  });

  it("returns true when current time equals expiry time", () => {
    const now = new Date();
    expect(isLinkExpired(now, now)).toBe(true);
  });

  it("handles edge case of expiry 1ms in the future", () => {
    const now = new Date();
    const almostExpired = new Date(now.getTime() + 1);
    expect(isLinkExpired(almostExpired, now)).toBe(false);
  });

  it("accepts injectable now parameter for testing", () => {
    const expiry = new Date("2025-01-15T12:00:00Z");
    const before = new Date("2025-01-15T11:00:00Z");
    const after = new Date("2025-01-15T13:00:00Z");

    expect(isLinkExpired(expiry, before)).toBe(false);
    expect(isLinkExpired(expiry, after)).toBe(true);
  });
});

describe("buildResumeUrl", () => {
  it("builds the correct resume URL path", () => {
    const token = "abc123_def456-ghi789";
    const url = buildResumeUrl(token);
    expect(url).toBe("/d2c/resume/abc123_def456-ghi789");
  });

  it("handles URL-safe characters correctly", () => {
    const token = "A-Z_a-z_0-9";
    const url = buildResumeUrl(token);
    expect(url).toBe("/d2c/resume/A-Z_a-z_0-9");
  });
});

// ============================================================================
// Database Function Tests (With Mocking)
// ============================================================================

describe("createResumeLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when client is not found", async () => {
    mockClientFindFirst.mockResolvedValue(null);

    const result = await createResumeLink(
      TEST_UUIDS.validClientId,
      TEST_UUIDS.validUserId,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("CLIENT_NOT_FOUND");
      expect(result.message).toContain("not found");
    }
  });

  it("returns error when client is not in draft status", async () => {
    mockClientFindFirst.mockResolvedValue(
      createMockClient({ status: "active" }),
    );

    const result = await createResumeLink(
      TEST_UUIDS.validClientId,
      TEST_UUIDS.validUserId,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("CLIENT_NOT_DRAFT");
      expect(result.message).toContain("draft");
    }
  });

  it("creates resume link for valid draft client", async () => {
    mockClientFindFirst.mockResolvedValue(
      createMockClient({ status: "draft" }),
    );

    const result = await createResumeLink(
      TEST_UUIDS.validClientId,
      TEST_UUIDS.validUserId,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.token).toHaveLength(43);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.resumeUrl).toContain("/d2c/resume/");
      expect(result.resumeUrl).toContain(result.token);
    }
    expect(mockInsert).toHaveBeenCalled();
  });
});

describe("verifyResumeLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns NOT_FOUND when link does not exist", async () => {
    mockResumeLinkFindFirst.mockResolvedValue(null);

    const result = await verifyResumeLink(
      "nonexistent-token",
      TEST_UUIDS.validUserId,
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorCode).toBe("NOT_FOUND");
    }
  });

  it("returns UNAUTHORIZED when link belongs to different user", async () => {
    mockResumeLinkFindFirst.mockResolvedValue(
      createMockResumeLink({ userId: TEST_UUIDS.otherUserId }),
    );

    const result = await verifyResumeLink("test-token", TEST_UUIDS.validUserId);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorCode).toBe("UNAUTHORIZED");
    }
  });

  it("returns EXPIRED when link has expired", async () => {
    mockResumeLinkFindFirst.mockResolvedValue(
      createExpiredResumeLink({ userId: TEST_UUIDS.validUserId }),
    );

    const result = await verifyResumeLink("test-token", TEST_UUIDS.validUserId);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorCode).toBe("EXPIRED");
    }
  });

  it("returns ALREADY_USED when link has been used", async () => {
    mockResumeLinkFindFirst.mockResolvedValue(
      createUsedResumeLink({ userId: TEST_UUIDS.validUserId }),
    );

    const result = await verifyResumeLink("test-token", TEST_UUIDS.validUserId);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorCode).toBe("ALREADY_USED");
    }
  });

  it("returns CLIENT_NOT_DRAFT when client is no longer draft", async () => {
    mockResumeLinkFindFirst.mockResolvedValue(
      createMockResumeLink({ userId: TEST_UUIDS.validUserId }),
    );
    mockClientFindFirst.mockResolvedValue(
      createMockClient({ status: "active" }),
    );

    const result = await verifyResumeLink("test-token", TEST_UUIDS.validUserId);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorCode).toBe("CLIENT_NOT_DRAFT");
    }
  });

  it("returns valid result for valid unexpired link", async () => {
    const mockLink = createMockResumeLink({
      userId: TEST_UUIDS.validUserId,
      clientId: TEST_UUIDS.validClientId,
    });
    mockResumeLinkFindFirst.mockResolvedValue(mockLink);
    mockClientFindFirst.mockResolvedValue(
      createMockClient({ status: "draft" }),
    );

    const result = await verifyResumeLink("test-token", TEST_UUIDS.validUserId);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.clientId).toBe(TEST_UUIDS.validClientId);
      expect(result.linkId).toBe(mockLink.id);
    }
  });
});

describe("markResumeLinkUsed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the link with usedAt timestamp", async () => {
    await markResumeLinkUsed(TEST_UUIDS.validLinkId);

    expect(mockUpdate).toHaveBeenCalled();
  });
});
