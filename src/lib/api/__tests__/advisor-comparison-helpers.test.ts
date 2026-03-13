import { beforeEach, describe, expect, it, vi } from "vitest";

import { TEST_UUIDS } from "./helpers/d2c-resume-link-test-helpers";
import { findAdvisorCarrierComparison } from "../advisor-comparison-helpers";

const mockClientFindFirst = vi.fn();
const mockListProviderIds = vi.fn();
const mockGetCarrierProvider = vi.fn();
const mockEstimateRange = vi.fn();

vi.mock("@/server/db", () => ({
  getDb: vi.fn(() => ({
    query: {
      client: {
        findFirst: mockClientFindFirst,
      },
    },
  })),
}));

vi.mock("@/lib/providers/carrier-registry", () => ({
  listProviderIds: () => mockListProviderIds(),
  getCarrierProvider: (...args: unknown[]) => mockGetCarrierProvider(...args),
}));

function createClientRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_UUIDS.validClientId,
    state: "ON",
    dateOfBirth: "1990-01-01",
    smoker: false,
    existingLifeInsuranceCoverage: "500000.00",
    replacementDurationYears: 20,
    ...overrides,
  };
}

describe("findAdvisorCarrierComparison", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListProviderIds.mockReturnValue(["mock"]);
    mockEstimateRange.mockResolvedValue({
      lowMonthlyPremiumCad: 44,
      highMonthlyPremiumCad: 66,
      currency: "CAD",
      nonBinding: true,
    });
    mockGetCarrierProvider.mockReturnValue({
      providerId: "mock",
      getEstimateRange: mockEstimateRange,
    });
  });

  it("returns found false when client is missing", async () => {
    mockClientFindFirst.mockResolvedValue(null);

    const result = await findAdvisorCarrierComparison(
      TEST_UUIDS.validClientId,
      TEST_UUIDS.validUserId,
      new Date("2026-03-12T00:00:00Z"),
    );

    expect(result).toEqual({ found: false });
  });

  it("returns not-ready when required comparison fields are missing", async () => {
    mockClientFindFirst.mockResolvedValue(
      createClientRecord({ existingLifeInsuranceCoverage: "0" }),
    );

    const result = await findAdvisorCarrierComparison(
      TEST_UUIDS.validClientId,
      TEST_UUIDS.validUserId,
      new Date("2026-03-12T00:00:00Z"),
    );

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.ready).toBe(false);
      if (!result.ready) {
        expect(result.missingFields).toContain("coverageAmount");
      }
    }
  });

  it("returns normalized request and provider options", async () => {
    mockClientFindFirst.mockResolvedValue(createClientRecord());

    const result = await findAdvisorCarrierComparison(
      TEST_UUIDS.validClientId,
      TEST_UUIDS.validUserId,
      new Date("2026-03-12T00:00:00Z"),
    );

    expect(result.found).toBe(true);
    if (result.found && result.ready) {
      expect(result.request).toEqual({
        province: "ON",
        age: 36,
        tobaccoUse: false,
        coverageAmount: 500000,
        termYears: 20,
      });
      expect(result.options).toEqual([
        {
          providerKey: "mock",
          premiumRange: {
            lowMonthlyPremiumCad: 44,
            highMonthlyPremiumCad: 66,
            currency: "CAD",
            nonBinding: true,
          },
        },
      ]);
    }

    expect(mockEstimateRange).toHaveBeenCalledWith({
      province: "ON",
      age: 36,
      tobaccoUse: false,
      coverageAmount: 500000,
      termYears: 20,
    });
  });
});
