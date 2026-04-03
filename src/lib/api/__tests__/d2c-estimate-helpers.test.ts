/**
 * @fileoverview Unit tests for D2C estimate helper functions.
 *
 * Verifies that repeated visits to the estimate page reuse the latest
 * persisted estimate row when the draft inputs have not changed.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockAssumptionVersionFindFirst,
  mockEstimateRunFindFirst,
  mockInsert,
  mockValues,
  mockReturning,
} = vi.hoisted(() => {
  const assumptionVersionFindFirst = vi.fn();
  const estimateRunFindFirst = vi.fn();
  const insert = vi.fn();
  const values = vi.fn();
  const returning = vi.fn();

  insert.mockReturnValue({ values });
  values.mockReturnValue({ returning });

  return {
    mockAssumptionVersionFindFirst: assumptionVersionFindFirst,
    mockEstimateRunFindFirst: estimateRunFindFirst,
    mockInsert: insert,
    mockValues: values,
    mockReturning: returning,
  };
});

vi.mock("@/server/db", () => ({
  getDb: vi.fn(() => ({
    query: {
      assumptionVersion: { findFirst: mockAssumptionVersionFindFirst },
      estimateRun: { findFirst: mockEstimateRunFindFirst },
    },
    insert: mockInsert,
  })),
}));

import { calculateInsuranceNeedsRounded } from "@/lib/financial/insurance-needs";
import { getMockPremiumRangeMonthly } from "@/lib/providers/mock-term-life-provider";
import {
  CURRENT_ASSUMPTION_VERSION,
  ESTIMATE_ENGINE_ID,
  ESTIMATE_ENGINE_VERSION,
} from "@/lib/d2c/estimate-assumptions";
import {
  clearAssumptionVersionCache,
  runEstimate,
  type RunEstimateInput,
} from "../d2c-estimate-helpers";

const TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440002";
const TEST_CLIENT_ID = "550e8400-e29b-41d4-a716-446655440001";
const TEST_ASSUMPTION_VERSION_ID = "550e8400-e29b-41d4-a716-446655440050";

/**
 * Builds a realistic estimate input payload for D2C draft tests.
 *
 * @param overrides - Optional field overrides for the base input.
 * @returns A fully populated estimate input object.
 */
function createEstimateInput(
  overrides: Partial<RunEstimateInput> = {},
): RunEstimateInput {
  return {
    userId: TEST_USER_ID,
    clientId: TEST_CLIENT_ID,
    source: "d2c",
    annualIncome: 142_500,
    age: 36,
    province: "ON",
    tobaccoUse: false,
    termYears: 20,
    coverageAmountOverride: 750_000,
    ...overrides,
  };
}

/**
 * Builds the normalized input and output snapshots that runEstimate persists.
 *
 * @param input - The request payload being evaluated.
 * @returns Matching input and output snapshots for the given payload.
 */
function buildSnapshots(input: RunEstimateInput) {
  const params = CURRENT_ASSUMPTION_VERSION.parameters;
  const estateBuffer =
    params.estateBuffer.type === "fixed"
      ? { type: "fixed" as const, amount: params.estateBuffer.value }
      : {
          type: "percentage" as const,
          percentage: params.estateBuffer.value,
        };

  const needs = calculateInsuranceNeedsRounded({
    clientIncome: input.annualIncome,
    spouseIncome: 0,
    includeSpouseIncome: false,
    incomeReplacementPercent: params.incomeReplacementPercent,
    replacementDurationYears: params.replacementDurationYears,
    existingLifeInsuranceCoverage: params.existingCoverageDefault,
    totalDebts: params.totalDebtsDefault,
    liquidAssets: params.liquidAssetsDefault,
    totalAssets: 0,
    estateBuffer,
  });

  const recommendedCoverage =
    input.coverageAmountOverride > 0
      ? input.coverageAmountOverride
      : needs.totalInsuranceNeeds;

  const premiumRange = getMockPremiumRangeMonthly({
    age: input.age,
    tobaccoUse: input.tobaccoUse,
    province: input.province,
    termYears: input.termYears,
    coverageAmount: recommendedCoverage,
  });

  return {
    inputs: {
      annualIncome: input.annualIncome,
      age: input.age,
      province: input.province,
      tobaccoUse: input.tobaccoUse,
      termYears: input.termYears,
      coverageAmount: recommendedCoverage,
      includeSpouseIncome: false,
      spouseIncome: 0,
    },
    outputs: {
      insuranceNeeds: {
        incomeReplacementNeeds: needs.incomeReplacementNeeds,
        debtPayoffNeeds: needs.debtPayoffNeeds,
        estateBufferNeeds: needs.estateBufferNeeds,
        grossNeeds: needs.grossNeeds,
        existingCoverage: needs.existingCoverage,
        liquidAssets: needs.liquidAssets,
        totalInsuranceNeeds: needs.totalInsuranceNeeds,
      },
      recommendedCoverage,
      premiumRange: {
        lowMonthlyPremiumCad: premiumRange.lowMonthlyPremiumCad,
        highMonthlyPremiumCad: premiumRange.highMonthlyPremiumCad,
        currency: "CAD" as const,
        nonBinding: true as const,
      },
    },
  };
}

/**
 * Builds a persisted estimate_run row matching the helper's return shape.
 *
 * @param input - The estimate payload used to derive snapshots.
 * @param overrides - Optional persisted-field overrides.
 * @returns A realistic estimate_run record mock.
 */
function createPersistedRun(
  input: RunEstimateInput,
  overrides: Partial<{
    id: string;
    runNumber: number;
    createdAt: Date;
    assumptionVersionId: string;
  }> = {},
) {
  const snapshots = buildSnapshots(input);

  return {
    id: overrides.id ?? "550e8400-e29b-41d4-a716-446655440099",
    clientId: input.clientId,
    userId: input.userId,
    source: input.source,
    assumptionVersionId:
      overrides.assumptionVersionId ?? TEST_ASSUMPTION_VERSION_ID,
    engineId: ESTIMATE_ENGINE_ID,
    engineVersion: ESTIMATE_ENGINE_VERSION,
    providerKey: "mock",
    inputs: snapshots.inputs,
    outputs: snapshots.outputs,
    runNumber: overrides.runNumber ?? 1,
    createdAt: overrides.createdAt ?? new Date("2026-03-27T10:00:00.000Z"),
  };
}

describe("runEstimate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAssumptionVersionCache();
    mockAssumptionVersionFindFirst.mockResolvedValue({
      id: TEST_ASSUMPTION_VERSION_ID,
      versionLabel: CURRENT_ASSUMPTION_VERSION.versionLabel,
    });
  });

  it("reuses the latest persisted estimate when draft inputs are unchanged", async () => {
    const input = createEstimateInput();
    const existingRun = createPersistedRun(input, { runNumber: 3 });

    mockEstimateRunFindFirst.mockResolvedValue(existingRun);

    const result = await runEstimate(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.reusedExisting).toBe(true);
      expect(result.estimateRun.id).toBe(existingRun.id);
      expect(result.estimateRun.runNumber).toBe(3);
      expect(result.estimateRun.inputs).toEqual(existingRun.inputs);
      expect(result.estimateRun.outputs).toEqual(existingRun.outputs);
    }
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("creates a new persisted estimate when the latest draft inputs changed", async () => {
    const existingInput = createEstimateInput({ termYears: 15 });
    const latestRun = createPersistedRun(existingInput, { runNumber: 1 });
    const currentInput = createEstimateInput({ termYears: 20 });
    const insertedRun = {
      id: "550e8400-e29b-41d4-a716-446655440120",
      runNumber: 2,
      createdAt: new Date("2026-03-27T11:00:00.000Z"),
    };

    mockEstimateRunFindFirst.mockResolvedValue(latestRun);
    mockReturning.mockResolvedValueOnce([insertedRun]);

    const result = await runEstimate(currentInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.reusedExisting).toBe(false);
      expect(result.estimateRun.id).toBe(insertedRun.id);
      expect(result.estimateRun.runNumber).toBe(2);
      expect(result.estimateRun.inputs.termYears).toBe(20);
      expect(result.estimateRun.outputs.recommendedCoverage).toBe(750_000);
    }
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: TEST_CLIENT_ID,
        userId: TEST_USER_ID,
        source: "d2c",
        runNumber: 2,
      }),
    );
  });

  it("retries with the next run number after a unique constraint collision", async () => {
    const existingInput = createEstimateInput({ termYears: 15 });
    const currentInput = createEstimateInput({ termYears: 20 });
    const latestRun = createPersistedRun(existingInput, { runNumber: 1 });
    const insertedRun = {
      id: "550e8400-e29b-41d4-a716-446655440121",
      runNumber: 2,
      createdAt: new Date("2026-03-27T11:30:00.000Z"),
    };

    mockEstimateRunFindFirst
      .mockResolvedValueOnce(latestRun)
      .mockResolvedValueOnce({ ...latestRun, runNumber: 1 });
    mockReturning
      .mockRejectedValueOnce(
        Object.assign(new Error("unique_violation"), { code: "23505" }),
      )
      .mockResolvedValueOnce([insertedRun]);

    const result = await runEstimate(currentInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.reusedExisting).toBe(false);
      expect(result.estimateRun.runNumber).toBe(2);
      expect(result.estimateRun.id).toBe(insertedRun.id);
    }
    expect(mockEstimateRunFindFirst).toHaveBeenCalledTimes(2);
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it("re-reads the seeded assumption version after a duplicate insert race", async () => {
    const input = createEstimateInput();
    const existingRun = createPersistedRun(input, { runNumber: 3 });

    mockAssumptionVersionFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: TEST_ASSUMPTION_VERSION_ID,
        versionLabel: CURRENT_ASSUMPTION_VERSION.versionLabel,
      });
    mockEstimateRunFindFirst.mockResolvedValue(existingRun);
    mockReturning.mockRejectedValueOnce(
      Object.assign(new Error("unique_violation"), { code: "23505" }),
    );

    const result = await runEstimate(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.reusedExisting).toBe(true);
      expect(result.estimateRun.id).toBe(existingRun.id);
      expect(result.estimateRun.assumptionVersionId).toBe(
        TEST_ASSUMPTION_VERSION_ID,
      );
    }
    expect(mockAssumptionVersionFindFirst).toHaveBeenCalledTimes(2);
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockEstimateRunFindFirst).toHaveBeenCalledTimes(1);
  });
});
