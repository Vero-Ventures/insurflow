import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMockSession,
  TEST_UUIDS,
} from "@/lib/api/__tests__/helpers/d2c-resume-link-test-helpers";

const mockGetSession = vi.fn();
const mockProfileFindFirst = vi.fn();
const mockFindDraftById = vi.fn();
const mockRunEstimate = vi.fn();
const mockFindLatestEstimateRun = vi.fn();
const mockFindEstimateRunsByClient = vi.fn();
const mockVerifyClientOwnership = vi.fn();

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

vi.mock("@/server/axiom", () => ({
  createLogger: vi.fn(() => ({
    addContext: vi.fn(),
    info: vi.fn(async () => undefined),
    warn: vi.fn(async () => undefined),
    error: vi.fn(async () => undefined),
  })),
}));

vi.mock("@/lib/api/d2c-draft-helpers", () => ({
  findDraftById: (...args: unknown[]) => mockFindDraftById(...args),
}));

vi.mock("@/lib/api/d2c-estimate-helpers", () => ({
  runEstimate: (...args: unknown[]) => mockRunEstimate(...args),
  findLatestEstimateRun: (...args: unknown[]) => mockFindLatestEstimateRun(...args),
  findEstimateRunsByClient: (...args: unknown[]) =>
    mockFindEstimateRunsByClient(...args),
}));

vi.mock("@/lib/api/client-helpers", async () => {
  const actual = await vi.importActual("@/lib/api/client-helpers");
  return {
    ...actual,
    verifyClientOwnership: (...args: unknown[]) =>
      mockVerifyClientOwnership(...args),
  };
});

describe("POST /api/d2c/estimate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(createMockSession(TEST_UUIDS.validUserId));
    mockProfileFindFirst.mockResolvedValue({ accountType: "client" });
    mockFindDraftById.mockResolvedValue({
      found: true,
      draft: {
        id: TEST_UUIDS.validClientId,
        dateOfBirth: "1990-05-15",
      },
    });
  });

  async function postEstimate(overrides: Record<string, unknown> = {}) {
    const { POST } = await import("../route");
    return POST(
      new Request("http://localhost/api/d2c/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: TEST_UUIDS.validClientId,
          annualIncome: 120_000,
          age: 35,
          province: "ON",
          tobaccoUse: false,
          termYears: 20,
          coverageAmountOverride: 0,
          ...overrides,
        }),
      }),
      { params: Promise.resolve({}) },
    );
  }

  it("returns 404 when estimate helper detects client ownership loss", async () => {
    mockRunEstimate.mockResolvedValue({
      success: false,
      errorCode: "CLIENT_NOT_FOUND",
      message: "Client draft not found",
    });

    const response = await postEstimate();

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      errorCode: "CLIENT_NOT_FOUND",
    });
  });

  it("returns 409 when estimate helper detects draft status changed", async () => {
    mockRunEstimate.mockResolvedValue({
      success: false,
      errorCode: "CLIENT_NOT_DRAFT",
      message: "Client is no longer in draft status",
    });

    const response = await postEstimate();

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      errorCode: "CLIENT_NOT_DRAFT",
    });
  });

  it("passes the draft DOB to the estimate service instead of trusting request age", async () => {
    mockFindDraftById.mockResolvedValue({
      found: true,
      draft: {
        id: TEST_UUIDS.validClientId,
        dateOfBirth: "1990-05-15",
      },
    });
    mockRunEstimate.mockResolvedValue({
      success: true,
      reusedExisting: false,
      estimateRun: {
        id: "run-1",
        runNumber: 1,
        inputs: {},
        outputs: {},
        assumptionVersionId: "assumption-1",
        assumptionVersionLabel: "v1",
        engineId: "engine",
        engineVersion: "1.0.0",
        providerKey: "mock",
        createdAt: new Date("2026-04-12T00:00:00Z"),
      },
    });

    const response = await postEstimate({ age: 99 });

    expect(response.status).toBe(201);
    expect(mockRunEstimate).toHaveBeenCalledWith(
      expect.objectContaining({
        dateOfBirth: "1990-05-15",
      }),
    );
  });
});

describe("GET /api/d2c/estimate/[clientId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(createMockSession(TEST_UUIDS.validUserId));
    mockProfileFindFirst.mockResolvedValue({ accountType: "client" });
  });

  async function getEstimate(clientId: string, history = false) {
    const { GET } = await import("../[clientId]/route");
    const search = history ? "?history=true" : "";
    return GET(
      new Request(`http://localhost/api/d2c/estimate/${clientId}${search}`, {
        method: "GET",
      }),
      { params: Promise.resolve({ clientId }) },
    );
  }

  it("returns 404 when client is soft-deleted or not owned", async () => {
    mockVerifyClientOwnership.mockResolvedValue(null);

    const response = await getEstimate(TEST_UUIDS.validClientId);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Client not found" });
    expect(mockFindLatestEstimateRun).not.toHaveBeenCalled();
  });
});
