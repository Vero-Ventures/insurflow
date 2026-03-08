/**
 * @fileoverview Unit tests for D2C resume links API routes.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMockSession,
  TEST_UUIDS,
  generateValidToken,
} from "@/lib/api/__tests__/helpers/d2c-resume-link-test-helpers";

// ============================================================================
// Mock Setup
// ============================================================================

const mockGetSession = vi.fn();
const mockFindFirst = vi.fn();
const mockCreateResumeLink = vi.fn();
const mockVerifyResumeLink = vi.fn();
const mockMarkResumeLinkUsed = vi.fn();

vi.mock("@/server/better-auth/server", () => ({
  getSession: () => mockGetSession(),
}));

vi.mock("@/server/db", () => ({
  getDb: vi.fn(() => ({
    query: {
      userProfile: {
        findFirst: mockFindFirst,
      },
    },
  })),
}));

vi.mock("@/lib/api/d2c-resume-link-helpers", () => ({
  createResumeLink: (...args: unknown[]) => mockCreateResumeLink(...args),
  verifyResumeLink: (...args: unknown[]) => mockVerifyResumeLink(...args),
  markResumeLinkUsed: (...args: unknown[]) => mockMarkResumeLinkUsed(...args),
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
// POST /api/d2c/resume-links Tests
// ============================================================================

describe("POST /api/d2c/resume-links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(createMockSession(TEST_UUIDS.validUserId));
    mockFindFirst.mockResolvedValue({ accountType: "client" });
  });

  async function postResumeLink(body: unknown) {
    const { POST } = await import("../route");
    return POST(
      new Request("http://localhost/api/d2c/resume-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({}) },
    );
  }

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await postResumeLink({
      clientId: TEST_UUIDS.validClientId,
    });

    expect(response.status).toBe(401);
  }, 15000);

  it("returns 400 for invalid client ID format", async () => {
    const response = await postResumeLink({ clientId: "not-a-uuid" });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 for missing client ID", async () => {
    const response = await postResumeLink({});

    expect(response.status).toBe(400);
  });

  it("returns 404 when client not found", async () => {
    mockCreateResumeLink.mockResolvedValue({
      success: false,
      errorCode: "CLIENT_NOT_FOUND",
      message: "Client not found",
    });

    const response = await postResumeLink({
      clientId: TEST_UUIDS.validClientId,
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.errorCode).toBe("CLIENT_NOT_FOUND");
  });

  it("returns 400 when client is not in draft status", async () => {
    mockCreateResumeLink.mockResolvedValue({
      success: false,
      errorCode: "CLIENT_NOT_DRAFT",
      message: "Client is not a draft",
    });

    const response = await postResumeLink({
      clientId: TEST_UUIDS.validClientId,
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.errorCode).toBe("CLIENT_NOT_DRAFT");
  });

  it("returns 201 with resume link on success", async () => {
    const mockToken = generateValidToken();
    const mockExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    mockCreateResumeLink.mockResolvedValue({
      success: true,
      token: mockToken,
      expiresAt: mockExpiresAt,
      resumeUrl: `/d2c/resume/${mockToken}`,
    });

    const response = await postResumeLink({
      clientId: TEST_UUIDS.validClientId,
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.token).toBe(mockToken);
    expect(body.expiresAt).toBeDefined();
    expect(body.resumeUrl).toContain(mockToken);
  });
});

// ============================================================================
// GET /api/d2c/resume-links/[token] Tests
// ============================================================================

describe("GET /api/d2c/resume-links/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(createMockSession(TEST_UUIDS.validUserId));
    mockFindFirst.mockResolvedValue({ accountType: "client" });
  });

  async function getResumeLink(token: string) {
    const { GET } = await import("../[token]/route");
    return GET(
      new Request(`http://localhost/api/d2c/resume-links/${token}`, {
        method: "GET",
      }),
      { params: Promise.resolve({ token }) },
    );
  }

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await getResumeLink(generateValidToken());

    expect(response.status).toBe(401);
  });

  it("returns 404 for invalid token format (consistency with NOT_FOUND)", async () => {
    const response = await getResumeLink("invalid-short-token");

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.valid).toBe(false);
    expect(body.errorCode).toBe("NOT_FOUND");
  });

  it("returns 404 when token not found", async () => {
    mockVerifyResumeLink.mockResolvedValue({
      valid: false,
      errorCode: "NOT_FOUND",
      message: "Not found",
    });

    const response = await getResumeLink(generateValidToken());

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.valid).toBe(false);
    expect(body.errorCode).toBe("NOT_FOUND");
  });

  it("returns 404 when link belongs to different user (prevents token enumeration)", async () => {
    // Security: Returns NOT_FOUND instead of 403/UNAUTHORIZED to prevent
    // attackers from determining if a guessed token exists
    mockVerifyResumeLink.mockResolvedValue({
      valid: false,
      errorCode: "NOT_FOUND",
      message: "Resume link not found or has been revoked",
    });

    const response = await getResumeLink(generateValidToken());

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.errorCode).toBe("NOT_FOUND");
  });

  it("returns 400 when link expired", async () => {
    mockVerifyResumeLink.mockResolvedValue({
      valid: false,
      errorCode: "EXPIRED",
      message: "Link expired",
    });

    const response = await getResumeLink(generateValidToken());

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.errorCode).toBe("EXPIRED");
  });

  it("returns 400 when link already used", async () => {
    mockVerifyResumeLink.mockResolvedValue({
      valid: false,
      errorCode: "ALREADY_USED",
      message: "Already used",
    });

    const response = await getResumeLink(generateValidToken());

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.errorCode).toBe("ALREADY_USED");
  });

  it("returns 200 with client info on success", async () => {
    mockVerifyResumeLink.mockResolvedValue({
      valid: true,
      clientId: TEST_UUIDS.validClientId,
      linkId: TEST_UUIDS.validLinkId,
    });
    mockMarkResumeLinkUsed.mockResolvedValue(true);

    const response = await getResumeLink(generateValidToken());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(true);
    expect(body.clientId).toBe(TEST_UUIDS.validClientId);
    expect(body.redirectUrl).toContain(TEST_UUIDS.validClientId);
    expect(mockMarkResumeLinkUsed).toHaveBeenCalledWith(TEST_UUIDS.validLinkId);
  });

  it("returns 400 when concurrent request consumed the link (atomic protection)", async () => {
    mockVerifyResumeLink.mockResolvedValue({
      valid: true,
      clientId: TEST_UUIDS.validClientId,
      linkId: TEST_UUIDS.validLinkId,
    });
    // Simulate race condition: another request marked the link used first
    mockMarkResumeLinkUsed.mockResolvedValue(false);

    const response = await getResumeLink(generateValidToken());

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.valid).toBe(false);
    expect(body.errorCode).toBe("ALREADY_USED");
  });
});
