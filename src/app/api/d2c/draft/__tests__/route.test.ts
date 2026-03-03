/**
 * @fileoverview Unit tests for D2C draft API routes.
 *
 * Tests POST /api/d2c/draft, GET /api/d2c/draft,
 * and PATCH /api/d2c/draft/[clientId].
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMockSession,
  TEST_UUIDS,
} from "@/lib/api/__tests__/helpers/d2c-resume-link-test-helpers";

// ============================================================================
// Mock Setup
// ============================================================================

const mockGetSession = vi.fn();
const mockProfileFindFirst = vi.fn();
const mockCreateDraft = vi.fn();
const mockFindLatestDraft = vi.fn();
const mockUpdateDraft = vi.fn();

vi.mock("@/server/better-auth/server", () => ({
  getSession: () => mockGetSession(),
}));

vi.mock("@/server/db", () => ({
  getDb: vi.fn(() => ({
    query: {
      userProfile: {
        findFirst: mockProfileFindFirst,
      },
    },
  })),
}));

vi.mock("@/lib/api/d2c-draft-helpers", () => ({
  createDraft: (...args: unknown[]) => mockCreateDraft(...args),
  findLatestDraft: (...args: unknown[]) => mockFindLatestDraft(...args),
  updateDraft: (...args: unknown[]) => mockUpdateDraft(...args),
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
// Mock draft record
// ============================================================================

function createMockDraftRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_UUIDS.validClientId,
    firstName: "",
    lastName: "",
    dateOfBirth: "2000-01-01",
    sex: "M",
    state: "NY",
    smoker: false,
    healthRating: "standard",
    clientIncome: "0",
    existingLifeInsuranceCoverage: "0",
    replacementDurationYears: 20,
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================================
// POST /api/d2c/draft Tests
// ============================================================================

describe("POST /api/d2c/draft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(createMockSession(TEST_UUIDS.validUserId));
    mockProfileFindFirst.mockResolvedValue({ accountType: "client" });
  });

  async function postDraft(body?: unknown) {
    const { POST } = await import("../route");
    return POST(
      new Request("http://localhost/api/d2c/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body !== undefined ? JSON.stringify(body) : "{}",
      }),
      { params: Promise.resolve({}) },
    );
  }

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await postDraft();

    expect(response.status).toBe(401);
  });

  it("returns 201 when creating a new draft", async () => {
    const mockDraft = createMockDraftRecord();
    mockCreateDraft.mockResolvedValue({
      success: true,
      draft: mockDraft,
      existed: false,
    });

    const response = await postDraft();

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.draft).toBeDefined();
    expect(body.existed).toBe(false);
  });

  it("returns 200 when draft already exists (idempotent)", async () => {
    const mockDraft = createMockDraftRecord();
    mockCreateDraft.mockResolvedValue({
      success: true,
      draft: mockDraft,
      existed: true,
    });

    const response = await postDraft();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.draft).toBeDefined();
    expect(body.existed).toBe(true);
  });

  it("passes intake fields to createDraft when provided", async () => {
    const mockDraft = createMockDraftRecord();
    mockCreateDraft.mockResolvedValue({
      success: true,
      draft: mockDraft,
      existed: false,
    });

    await postDraft({
      intake: {
        province: "ON",
        gender: "female",
        annualIncome: 100000,
      },
    });

    expect(mockCreateDraft).toHaveBeenCalled();
  });

  it("handles empty body gracefully", async () => {
    const mockDraft = createMockDraftRecord();
    mockCreateDraft.mockResolvedValue({
      success: true,
      draft: mockDraft,
      existed: false,
    });

    const response = await postDraft({});

    expect(response.status).toBe(201);
  });

  it("returns 500 when draft creation fails", async () => {
    mockCreateDraft.mockResolvedValue({
      success: false,
      errorCode: "INSERT_FAILED",
      message: "Failed to create draft",
    });

    const response = await postDraft();

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.errorCode).toBe("INSERT_FAILED");
  });
});

// ============================================================================
// GET /api/d2c/draft Tests
// ============================================================================

describe("GET /api/d2c/draft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(createMockSession(TEST_UUIDS.validUserId));
    mockProfileFindFirst.mockResolvedValue({ accountType: "client" });
  });

  async function getDraft() {
    const { GET } = await import("../route");
    return GET(
      new Request("http://localhost/api/d2c/draft", {
        method: "GET",
      }),
      { params: Promise.resolve({}) },
    );
  }

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await getDraft();

    expect(response.status).toBe(401);
  });

  it("returns 200 with draft when one exists", async () => {
    const mockDraft = createMockDraftRecord();
    mockFindLatestDraft.mockResolvedValue({
      found: true,
      draft: mockDraft,
    });

    const response = await getDraft();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.draft).toBeDefined();
    expect(body.draft.id).toBe(TEST_UUIDS.validClientId);
  });

  it("returns 404 when no draft exists", async () => {
    mockFindLatestDraft.mockResolvedValue({ found: false });

    const response = await getDraft();

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toContain("No draft");
  });
});

// ============================================================================
// PATCH /api/d2c/draft/[clientId] Tests
// ============================================================================

describe("PATCH /api/d2c/draft/[clientId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(createMockSession(TEST_UUIDS.validUserId));
    mockProfileFindFirst.mockResolvedValue({ accountType: "client" });
  });

  async function patchDraft(clientId: string, body: unknown) {
    const { PATCH } = await import("../[clientId]/route");
    return PATCH(
      new Request(`http://localhost/api/d2c/draft/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ clientId }) },
    );
  }

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await patchDraft(TEST_UUIDS.validClientId, {
      intake: { annualIncome: 50000 },
    });

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid client ID format", async () => {
    const response = await patchDraft("not-a-uuid", {
      intake: { annualIncome: 50000 },
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Invalid client ID");
  });

  it("returns 400 for empty intake", async () => {
    const response = await patchDraft(TEST_UUIDS.validClientId, {
      intake: {},
    });

    expect(response.status).toBe(400);
  });

  it("returns 400 for missing intake field", async () => {
    const response = await patchDraft(TEST_UUIDS.validClientId, {});

    expect(response.status).toBe(400);
  });

  it("returns 200 on successful update", async () => {
    const updatedDraft = createMockDraftRecord({ smoker: true });
    mockUpdateDraft.mockResolvedValue({
      success: true,
      draft: updatedDraft,
    });

    const response = await patchDraft(TEST_UUIDS.validClientId, {
      intake: { tobaccoUse: true },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.draft).toBeDefined();
  });

  it("returns 404 when draft not found", async () => {
    mockUpdateDraft.mockResolvedValue({
      success: false,
      errorCode: "NOT_FOUND",
      message: "Draft not found",
    });

    const response = await patchDraft(TEST_UUIDS.validClientId, {
      intake: { tobaccoUse: true },
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.errorCode).toBe("NOT_FOUND");
  });

  it("returns 409 when client is no longer draft", async () => {
    mockUpdateDraft.mockResolvedValue({
      success: false,
      errorCode: "NOT_DRAFT",
      message: "Client is no longer in draft status",
    });

    const response = await patchDraft(TEST_UUIDS.validClientId, {
      intake: { tobaccoUse: true },
    });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.errorCode).toBe("NOT_DRAFT");
  });
});
