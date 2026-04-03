import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "../route";

import {
  createMockSession,
  TEST_UUIDS,
} from "@/lib/api/__tests__/helpers/d2c-resume-link-test-helpers";

const {
  mockGetSession,
  mockProfileFindFirst,
  mockFindAdvisorCarrierComparison,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockProfileFindFirst: vi.fn(),
  mockFindAdvisorCarrierComparison: vi.fn(),
}));

vi.mock("@/server/better-auth/server", () => ({
  getSession: mockGetSession,
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

vi.mock("@/lib/api/advisor-comparison-helpers", () => ({
  findAdvisorCarrierComparison: (...args: unknown[]) =>
    mockFindAdvisorCarrierComparison(...args),
}));

async function getComparison(clientId: string) {
  return GET(
    new Request(
      `http://localhost/api/advisor/clients/${clientId}/carrier-comparison`,
      { method: "GET" },
    ),
    { params: Promise.resolve({ clientId }) },
  );
}

describe("GET /api/advisor/clients/[clientId]/carrier-comparison", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(createMockSession(TEST_UUIDS.validUserId));
    mockProfileFindFirst.mockResolvedValue({ accountType: "advisor" });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await getComparison(TEST_UUIDS.validClientId);

    expect(response.status).toBe(401);
  });

  it("returns 403 for non-advisor accounts", async () => {
    mockProfileFindFirst.mockResolvedValue({ accountType: "client" });

    const response = await getComparison(TEST_UUIDS.validClientId);

    expect(response.status).toBe(403);
  });

  it("returns 400 for invalid client ID", async () => {
    const response = await getComparison("not-a-uuid");

    expect(response.status).toBe(400);
  });

  it("returns 404 when client is not found", async () => {
    mockFindAdvisorCarrierComparison.mockResolvedValue({ found: false });

    const response = await getComparison(TEST_UUIDS.validClientId);

    expect(response.status).toBe(404);
  });

  it("returns 422 when comparison data is incomplete", async () => {
    mockFindAdvisorCarrierComparison.mockResolvedValue({
      found: true,
      ready: false,
      missingFields: ["coverageAmount"],
    });

    const response = await getComparison(TEST_UUIDS.validClientId);

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.missingFields).toEqual(["coverageAmount"]);
  });

  it("returns 200 with comparison payload", async () => {
    mockFindAdvisorCarrierComparison.mockResolvedValue({
      found: true,
      ready: true,
      request: {
        province: "ON",
        age: 36,
        tobaccoUse: false,
        coverageAmount: 500000,
        termYears: 20,
      },
      options: [
        {
          providerKey: "mock",
          premiumRange: {
            lowMonthlyPremiumCad: 44,
            highMonthlyPremiumCad: 66,
            currency: "CAD",
            nonBinding: true,
          },
        },
      ],
    });

    const response = await getComparison(TEST_UUIDS.validClientId);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.request.province).toBe("ON");
    expect(body.options).toHaveLength(1);
    expect(mockFindAdvisorCarrierComparison).toHaveBeenCalledWith(
      TEST_UUIDS.validClientId,
      TEST_UUIDS.validUserId,
    );
  });
});
