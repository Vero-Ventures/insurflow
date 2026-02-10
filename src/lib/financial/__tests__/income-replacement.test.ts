import { describe, it, expect } from "vitest";
import {
  calculateAdvancedIncomeReplacement,
  resolveDuration,
  LIFETIME_AGE_CAP,
  MAX_DURATION_YEARS,
  type IncomeReplacementInput,
} from "../income-replacement";
import { DEFAULT_DISCOUNT_RATE, DEFAULT_INFLATION_RATE } from "@/lib/constants";

// ============================================================================
// Helpers
// ============================================================================

/** Shorthand to build a custom-duration input. */
function makeInput(
  overrides: Partial<IncomeReplacementInput> = {},
): IncomeReplacementInput {
  return {
    baseAnnualIncome: 100_000,
    replacementRatio: 0.7,
    duration: { type: "custom", years: 10 },
    ...overrides,
  };
}

/** Round helper matching the engine's precision. */
function r(value: number): number {
  return Math.round(value * 100) / 100;
}

// ============================================================================
// resolveDuration
// ============================================================================

describe("resolveDuration", () => {
  it("resolves childTurns18 correctly", () => {
    expect(resolveDuration({ type: "childTurns18", youngestChildAge: 5 })).toBe(
      13,
    );
    expect(resolveDuration({ type: "childTurns18", youngestChildAge: 0 })).toBe(
      18,
    );
    expect(
      resolveDuration({ type: "childTurns18", youngestChildAge: 18 }),
    ).toBe(0);
    expect(
      resolveDuration({ type: "childTurns18", youngestChildAge: 20 }),
    ).toBe(0);
  });

  it("resolves retirement correctly", () => {
    expect(
      resolveDuration({
        type: "retirement",
        currentAge: 40,
        retirementAge: 65,
      }),
    ).toBe(25);
    expect(
      resolveDuration({
        type: "retirement",
        currentAge: 65,
        retirementAge: 65,
      }),
    ).toBe(0);
  });

  it("resolves lifetime correctly", () => {
    expect(resolveDuration({ type: "lifetime", currentAge: 35 })).toBe(
      LIFETIME_AGE_CAP - 35,
    );
    expect(resolveDuration({ type: "lifetime", currentAge: 0 })).toBe(
      Math.min(LIFETIME_AGE_CAP, MAX_DURATION_YEARS),
    );
  });

  it("resolves custom duration correctly", () => {
    expect(resolveDuration({ type: "custom", years: 20 })).toBe(20);
    expect(resolveDuration({ type: "custom", years: 0 })).toBe(0);
    expect(resolveDuration({ type: "custom", years: -5 })).toBe(0);
  });

  it("clamps duration to MAX_DURATION_YEARS", () => {
    expect(resolveDuration({ type: "custom", years: 200 })).toBe(
      MAX_DURATION_YEARS,
    );
    expect(resolveDuration({ type: "lifetime", currentAge: 10 })).toBe(
      Math.min(LIFETIME_AGE_CAP - 10, MAX_DURATION_YEARS),
    );
  });

  it("floors fractional child ages", () => {
    // 5.7 → floored to 5, so 18 - 5 = 13
    expect(
      resolveDuration({ type: "childTurns18", youngestChildAge: 5.7 }),
    ).toBe(13);
  });

  it("handles negative ages by clamping to 0", () => {
    expect(
      resolveDuration({ type: "childTurns18", youngestChildAge: -3 }),
    ).toBe(18);
    expect(
      resolveDuration({
        type: "retirement",
        currentAge: -5,
        retirementAge: 65,
      }),
    ).toBe(65);
  });
});

// ============================================================================
// calculateAdvancedIncomeReplacement — basic behaviour
// ============================================================================

describe("calculateAdvancedIncomeReplacement", () => {
  describe("resolved inputs / defaults", () => {
    it("applies default inflation and discount rates when omitted", () => {
      const result = calculateAdvancedIncomeReplacement(makeInput());
      expect(result.resolvedInputs.inflationRate).toBe(DEFAULT_INFLATION_RATE);
      expect(result.resolvedInputs.discountRate).toBe(DEFAULT_DISCOUNT_RATE);
    });

    it("uses provided rates when specified", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({ inflationRate: 0.03, discountRate: 0.06 }),
      );
      expect(result.resolvedInputs.inflationRate).toBe(0.03);
      expect(result.resolvedInputs.discountRate).toBe(0.06);
    });

    it("clamps replacement ratio to [0, 1]", () => {
      const over = calculateAdvancedIncomeReplacement(
        makeInput({ replacementRatio: 1.5 }),
      );
      expect(over.resolvedInputs.replacementRatio).toBe(1);

      const under = calculateAdvancedIncomeReplacement(
        makeInput({ replacementRatio: -0.3 }),
      );
      expect(under.resolvedInputs.replacementRatio).toBe(0);
    });

    it("clamps negative base income to 0", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({ baseAnnualIncome: -50_000 }),
      );
      expect(result.resolvedInputs.baseAnnualIncome).toBe(0);
      expect(result.presentValueTotal).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Zero / edge-case durations
  // --------------------------------------------------------------------------

  describe("zero and edge-case durations", () => {
    it("returns zeroed result for zero duration", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({ duration: { type: "custom", years: 0 } }),
      );
      expect(result.durationYears).toBe(0);
      expect(result.annualSchedule).toEqual([]);
      expect(result.presentValueTotal).toBe(0);
      expect(result.survivorResourcesPV).toBe(0);
      expect(result.netCoverageNeededPV).toBe(0);
    });

    it("returns zeroed result for negative duration", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({ duration: { type: "custom", years: -10 } }),
      );
      expect(result.durationYears).toBe(0);
      expect(result.annualSchedule).toEqual([]);
    });

    it("handles 1-year duration", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({ duration: { type: "custom", years: 1 } }),
      );
      expect(result.durationYears).toBe(1);
      expect(result.annualSchedule).toHaveLength(1);
      expect(result.annualSchedule[0]!.year).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Inflation compounding
  // --------------------------------------------------------------------------

  describe("inflation compounding", () => {
    it("produces correct inflation-adjusted income needs", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({
          baseAnnualIncome: 100_000,
          replacementRatio: 1.0,
          inflationRate: 0.02,
          discountRate: 0.0, // zero discount to isolate inflation
          duration: { type: "custom", years: 3 },
        }),
      );

      const schedule = result.annualSchedule;
      expect(schedule).toHaveLength(3);

      // Year 1: 100000 * (1.02)^1
      expect(schedule[0]!.incomeNeed).toBeCloseTo(102_000, 2);
      // Year 2: 100000 * (1.02)^2
      expect(schedule[1]!.incomeNeed).toBeCloseTo(104_040, 2);
      // Year 3: 100000 * (1.02)^3
      expect(schedule[2]!.incomeNeed).toBeCloseTo(106_120.8, 1);
    });

    it("with zero inflation, income needs stay constant", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({
          baseAnnualIncome: 80_000,
          replacementRatio: 0.7,
          inflationRate: 0,
          discountRate: 0,
          duration: { type: "custom", years: 3 },
        }),
      );

      const expected = 80_000 * 0.7;
      for (const entry of result.annualSchedule) {
        expect(entry.incomeNeed).toBeCloseTo(expected, 2);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Present value discounting
  // --------------------------------------------------------------------------

  describe("present value discounting", () => {
    it("with zero discount rate, PV equals nominal total", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({
          baseAnnualIncome: 100_000,
          replacementRatio: 1,
          inflationRate: 0,
          discountRate: 0,
          duration: { type: "custom", years: 5 },
        }),
      );

      // 100000 * 5 = 500000
      expect(result.presentValueTotal).toBeCloseTo(500_000, 2);
    });

    it("PV is less than nominal when discount rate > inflation", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({
          baseAnnualIncome: 100_000,
          replacementRatio: 0.7,
          inflationRate: 0.02,
          discountRate: 0.05,
          duration: { type: "custom", years: 10 },
        }),
      );

      // Nominal total (with inflation) would be higher than PV
      const nominalTotal = result.annualSchedule.reduce(
        (sum, e) => sum + e.incomeNeed,
        0,
      );
      expect(result.presentValueTotal).toBeLessThan(nominalTotal);
      expect(result.presentValueTotal).toBeGreaterThan(0);
    });

    it("computes known PV for a single year", () => {
      // Year 1: need = 100000 * 0.7 * 1.02 = 71400
      // PV = 71400 / 1.05 = 68000
      const result = calculateAdvancedIncomeReplacement(
        makeInput({
          baseAnnualIncome: 100_000,
          replacementRatio: 0.7,
          inflationRate: 0.02,
          discountRate: 0.05,
          duration: { type: "custom", years: 1 },
        }),
      );

      expect(result.presentValueTotal).toBeCloseTo(71_400 / 1.05, 2);
    });

    it("computes known PV for two years manually", () => {
      const income = 100_000;
      const ratio = 0.7;
      const inf = 0.02;
      const disc = 0.05;

      const y1Need = income * ratio * Math.pow(1 + inf, 1);
      const y2Need = income * ratio * Math.pow(1 + inf, 2);
      const expectedPV =
        y1Need / Math.pow(1 + disc, 1) + y2Need / Math.pow(1 + disc, 2);

      const result = calculateAdvancedIncomeReplacement(
        makeInput({
          baseAnnualIncome: income,
          replacementRatio: ratio,
          inflationRate: inf,
          discountRate: disc,
          duration: { type: "custom", years: 2 },
        }),
      );

      expect(result.presentValueTotal).toBeCloseTo(expectedPV, 2);
    });
  });

  // --------------------------------------------------------------------------
  // Survivor resources
  // --------------------------------------------------------------------------

  describe("survivor resources", () => {
    it("deducts annual survivor resources from income need", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({
          baseAnnualIncome: 100_000,
          replacementRatio: 0.7,
          inflationRate: 0,
          discountRate: 0,
          duration: { type: "custom", years: 3 },
          survivorResources: {
            govSurvivorBenefit: 20_000,
            existingInsurance: 0,
            investmentIncome: 0,
            otherIncome: 0,
          },
        }),
      );

      // Each year: need = 70000, offset = 20000, net = 50000
      for (const entry of result.annualSchedule) {
        expect(entry.incomeNeed).toBe(70_000);
        expect(entry.survivorOffset).toBe(20_000);
        expect(entry.netNeed).toBe(50_000);
      }

      expect(result.netCoverageNeededPV).toBeCloseTo(150_000, 2);
    });

    it("treats existing insurance as lump-sum in year 1 only", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({
          baseAnnualIncome: 100_000,
          replacementRatio: 0.7,
          inflationRate: 0,
          discountRate: 0,
          duration: { type: "custom", years: 3 },
          survivorResources: {
            govSurvivorBenefit: 0,
            existingInsurance: 200_000,
            investmentIncome: 0,
            otherIncome: 0,
          },
        }),
      );

      // Year 1: offset = 200000, need = 70000, net = 0 (floored)
      expect(result.annualSchedule[0]!.survivorOffset).toBe(200_000);
      expect(result.annualSchedule[0]!.netNeed).toBe(0);

      // Year 2+: offset = 0
      expect(result.annualSchedule[1]!.survivorOffset).toBe(0);
      expect(result.annualSchedule[1]!.netNeed).toBe(70_000);
      expect(result.annualSchedule[2]!.survivorOffset).toBe(0);
    });

    it("nets coverage gap to zero when resources exceed needs", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({
          baseAnnualIncome: 50_000,
          replacementRatio: 0.5,
          inflationRate: 0,
          discountRate: 0,
          duration: { type: "custom", years: 5 },
          survivorResources: {
            govSurvivorBenefit: 30_000,
            existingInsurance: 0,
            investmentIncome: 10_000,
            otherIncome: 0,
          },
        }),
      );

      // Need per year = 25000, resources per year = 40000
      // net per year = 0
      expect(result.netCoverageNeededPV).toBe(0);
      for (const entry of result.annualSchedule) {
        expect(entry.netNeed).toBe(0);
      }
    });

    it("inflates survivor resources at the same rate as income", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({
          baseAnnualIncome: 100_000,
          replacementRatio: 1,
          inflationRate: 0.03,
          discountRate: 0,
          duration: { type: "custom", years: 2 },
          survivorResources: {
            govSurvivorBenefit: 10_000,
            existingInsurance: 0,
            investmentIncome: 0,
            otherIncome: 0,
          },
        }),
      );

      // Year 1: survivor = 10000 * 1.03 = 10300
      expect(result.annualSchedule[0]!.survivorOffset).toBeCloseTo(10_300, 2);
      // Year 2: survivor = 10000 * 1.03^2 = 10609
      expect(result.annualSchedule[1]!.survivorOffset).toBeCloseTo(10_609, 2);
    });

    it("clamps negative survivor resources to 0", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({
          survivorResources: {
            govSurvivorBenefit: -5_000,
            existingInsurance: -10_000,
            investmentIncome: -1_000,
            otherIncome: -500,
          },
        }),
      );

      const sr = result.resolvedInputs.survivorResources;
      expect(sr.govSurvivorBenefit).toBe(0);
      expect(sr.existingInsurance).toBe(0);
      expect(sr.investmentIncome).toBe(0);
      expect(sr.otherIncome).toBe(0);
    });

    it("defaults to zero survivor resources when omitted", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({
          baseAnnualIncome: 100_000,
          replacementRatio: 0.7,
          inflationRate: 0,
          discountRate: 0,
          duration: { type: "custom", years: 2 },
        }),
      );

      // No offsets
      for (const entry of result.annualSchedule) {
        expect(entry.survivorOffset).toBe(0);
        expect(entry.netNeed).toBe(entry.incomeNeed);
      }
      expect(result.survivorResourcesPV).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Duration scenarios
  // --------------------------------------------------------------------------

  describe("duration scenarios", () => {
    it("childTurns18 with 3-year-old produces 15-year schedule", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({
          duration: { type: "childTurns18", youngestChildAge: 3 },
        }),
      );
      expect(result.durationYears).toBe(15);
      expect(result.annualSchedule).toHaveLength(15);
    });

    it("retirement scenario from age 45 to 65 produces 20-year schedule", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({
          duration: { type: "retirement", currentAge: 45, retirementAge: 65 },
        }),
      );
      expect(result.durationYears).toBe(20);
      expect(result.annualSchedule).toHaveLength(20);
    });

    it("lifetime scenario at age 40 produces correct duration", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({
          duration: { type: "lifetime", currentAge: 40 },
        }),
      );
      expect(result.durationYears).toBe(LIFETIME_AGE_CAP - 40);
    });
  });

  // --------------------------------------------------------------------------
  // Full integration / real-world scenario
  // --------------------------------------------------------------------------

  describe("real-world scenarios", () => {
    it("35-year-old with $120K income, 70% replacement until retirement at 65", () => {
      const result = calculateAdvancedIncomeReplacement({
        baseAnnualIncome: 120_000,
        replacementRatio: 0.7,
        inflationRate: 0.02,
        discountRate: 0.05,
        duration: { type: "retirement", currentAge: 35, retirementAge: 65 },
        survivorResources: {
          govSurvivorBenefit: 15_000,
          existingInsurance: 250_000,
          investmentIncome: 5_000,
          otherIncome: 0,
        },
      });

      expect(result.durationYears).toBe(30);
      expect(result.annualSchedule).toHaveLength(30);

      // PV should be positive and reasonable
      expect(result.presentValueTotal).toBeGreaterThan(0);
      expect(result.survivorResourcesPV).toBeGreaterThan(0);
      expect(result.netCoverageNeededPV).toBeGreaterThan(0);

      // Net should be less than gross
      expect(result.netCoverageNeededPV).toBeLessThan(result.presentValueTotal);

      // Year 1 income need: 120000 * 0.7 * 1.02 = 85680
      expect(result.annualSchedule[0]!.incomeNeed).toBeCloseTo(85_680, 0);

      // Year 1 survivor offset includes lump-sum insurance:
      // (15000 + 5000) * 1.02 + 250000 = 20400 + 250000 = 270400
      expect(result.annualSchedule[0]!.survivorOffset).toBeCloseTo(270_400, 0);

      // Year 2 survivor offset: no lump sum → (15000 + 5000) * 1.02^2 = 20808
      expect(result.annualSchedule[1]!.survivorOffset).toBeCloseTo(20_808, 0);
    });

    it("high earner with child youngest 1, no resources", () => {
      const result = calculateAdvancedIncomeReplacement({
        baseAnnualIncome: 300_000,
        replacementRatio: 0.7,
        inflationRate: 0.025,
        discountRate: 0.04,
        duration: { type: "childTurns18", youngestChildAge: 1 },
      });

      expect(result.durationYears).toBe(17);
      expect(result.annualSchedule).toHaveLength(17);
      expect(result.survivorResourcesPV).toBe(0);
      expect(result.netCoverageNeededPV).toBe(result.presentValueTotal);
    });

    it("zero income produces zero result", () => {
      const result = calculateAdvancedIncomeReplacement({
        baseAnnualIncome: 0,
        replacementRatio: 0.7,
        duration: { type: "custom", years: 10 },
      });

      expect(result.presentValueTotal).toBe(0);
      expect(result.netCoverageNeededPV).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Schedule structure
  // --------------------------------------------------------------------------

  describe("schedule structure", () => {
    it("schedule years are 1-indexed and sequential", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({ duration: { type: "custom", years: 5 } }),
      );

      const years = result.annualSchedule.map((e) => e.year);
      expect(years).toEqual([1, 2, 3, 4, 5]);
    });

    it("all schedule values are rounded to 2 decimal places", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({
          baseAnnualIncome: 111_111,
          replacementRatio: 0.73,
          inflationRate: 0.031,
          discountRate: 0.047,
          duration: { type: "custom", years: 5 },
        }),
      );

      for (const entry of result.annualSchedule) {
        // Check that each value has at most 2 decimal places
        expect(entry.incomeNeed).toBe(r(entry.incomeNeed));
        expect(entry.survivorOffset).toBe(r(entry.survivorOffset));
        expect(entry.netNeed).toBe(r(entry.netNeed));
        expect(entry.netNeedPV).toBe(r(entry.netNeedPV));
      }

      expect(result.presentValueTotal).toBe(r(result.presentValueTotal));
      expect(result.survivorResourcesPV).toBe(r(result.survivorResourcesPV));
      expect(result.netCoverageNeededPV).toBe(r(result.netCoverageNeededPV));
    });
  });

  // --------------------------------------------------------------------------
  // PV identity: netCoverage = gross − resources
  // --------------------------------------------------------------------------

  describe("PV identity invariants", () => {
    it("netCoverageNeededPV = presentValueTotal − survivorResourcesPV when positive", () => {
      const result = calculateAdvancedIncomeReplacement({
        baseAnnualIncome: 120_000,
        replacementRatio: 0.7,
        inflationRate: 0.02,
        discountRate: 0.05,
        duration: { type: "custom", years: 20 },
        survivorResources: {
          govSurvivorBenefit: 12_000,
          existingInsurance: 100_000,
          investmentIncome: 3_000,
          otherIncome: 2_000,
        },
      });

      const expectedNet = Math.max(
        0,
        result.presentValueTotal - result.survivorResourcesPV,
      );
      // Allow 1 cent tolerance for rounding
      expect(result.netCoverageNeededPV).toBeCloseTo(expectedNet, 1);
    });

    it("netCoverageNeededPV is never negative", () => {
      const result = calculateAdvancedIncomeReplacement({
        baseAnnualIncome: 30_000,
        replacementRatio: 0.5,
        inflationRate: 0.02,
        discountRate: 0.05,
        duration: { type: "custom", years: 10 },
        survivorResources: {
          govSurvivorBenefit: 50_000,
          existingInsurance: 500_000,
          investmentIncome: 20_000,
          otherIncome: 10_000,
        },
      });

      expect(result.netCoverageNeededPV).toBe(0);
      expect(result.survivorResourcesPV).toBeGreaterThan(
        result.presentValueTotal,
      );
    });
  });

  // --------------------------------------------------------------------------
  // Equal inflation & discount rate (real growth = 0)
  // --------------------------------------------------------------------------

  describe("equal inflation and discount rate", () => {
    it("PV of each year is identical when inflation = discount", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({
          baseAnnualIncome: 100_000,
          replacementRatio: 0.7,
          inflationRate: 0.04,
          discountRate: 0.04,
          duration: { type: "custom", years: 5 },
        }),
      );

      // When inflation = discount, each year's PV should equal the
      // base amount (100000 * 0.7 = 70000). Net PV = 70000 per year.
      // (1+inf)^n / (1+disc)^n = 1 for all n
      const perYear = 100_000 * 0.7;
      expect(result.presentValueTotal).toBeCloseTo(perYear * 5, 0);

      for (const entry of result.annualSchedule) {
        expect(entry.netNeedPV).toBeCloseTo(perYear, 0);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Combined survivor resources with inflation
  // --------------------------------------------------------------------------

  describe("combined survivor resources with inflation", () => {
    it("all annual resource types are summed and inflated together", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({
          baseAnnualIncome: 200_000,
          replacementRatio: 1.0,
          inflationRate: 0.03,
          discountRate: 0,
          duration: { type: "custom", years: 2 },
          survivorResources: {
            govSurvivorBenefit: 10_000,
            existingInsurance: 0,
            investmentIncome: 5_000,
            otherIncome: 3_000,
          },
        }),
      );

      // annualBase = 10000 + 5000 + 3000 = 18000
      // Year 1: 18000 * 1.03 = 18540
      expect(result.annualSchedule[0]!.survivorOffset).toBeCloseTo(18_540, 2);
      // Year 2: 18000 * 1.03^2 = 19096.20
      expect(result.annualSchedule[1]!.survivorOffset).toBeCloseTo(19_096.2, 1);
    });

    it("lump-sum insurance + annual resources in year 1", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({
          baseAnnualIncome: 100_000,
          replacementRatio: 1.0,
          inflationRate: 0.02,
          discountRate: 0,
          duration: { type: "custom", years: 3 },
          survivorResources: {
            govSurvivorBenefit: 5_000,
            existingInsurance: 50_000,
            investmentIncome: 2_000,
            otherIncome: 1_000,
          },
        }),
      );

      // annualBase = 5000 + 2000 + 1000 = 8000
      // Year 1: annual * 1.02 + lump-sum = 8160 + 50000 = 58160
      expect(result.annualSchedule[0]!.survivorOffset).toBeCloseTo(58_160, 0);

      // Year 2: annual * 1.02^2 = 8323.20 (no lump-sum)
      expect(result.annualSchedule[1]!.survivorOffset).toBeCloseTo(8_323.2, 1);

      // Year 3: annual * 1.02^3 = 8489.66
      expect(result.annualSchedule[2]!.survivorOffset).toBeCloseTo(8_489.66, 0);
    });
  });

  // --------------------------------------------------------------------------
  // Rate clamping
  // --------------------------------------------------------------------------

  describe("rate clamping", () => {
    it("clamps inflation rate to [0, 0.5]", () => {
      const high = calculateAdvancedIncomeReplacement(
        makeInput({ inflationRate: 0.8 }),
      );
      expect(high.resolvedInputs.inflationRate).toBe(0.5);

      const low = calculateAdvancedIncomeReplacement(
        makeInput({ inflationRate: -0.1 }),
      );
      expect(low.resolvedInputs.inflationRate).toBe(0);
    });

    it("clamps discount rate to [0, 0.5]", () => {
      const high = calculateAdvancedIncomeReplacement(
        makeInput({ discountRate: 0.9 }),
      );
      expect(high.resolvedInputs.discountRate).toBe(0.5);

      const low = calculateAdvancedIncomeReplacement(
        makeInput({ discountRate: -0.05 }),
      );
      expect(low.resolvedInputs.discountRate).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Full replacement ratio (100%)
  // --------------------------------------------------------------------------

  describe("100% replacement ratio", () => {
    it("income need equals full income when ratio = 1", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({
          baseAnnualIncome: 80_000,
          replacementRatio: 1.0,
          inflationRate: 0,
          discountRate: 0,
          duration: { type: "custom", years: 3 },
        }),
      );

      for (const entry of result.annualSchedule) {
        expect(entry.incomeNeed).toBe(80_000);
      }
      expect(result.presentValueTotal).toBe(240_000);
    });
  });

  // --------------------------------------------------------------------------
  // Max-duration clamping through the engine
  // --------------------------------------------------------------------------

  describe("max duration clamping end-to-end", () => {
    it("clamps lifetime scenario at young age to MAX_DURATION_YEARS", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({
          duration: { type: "lifetime", currentAge: 10 },
        }),
      );

      const expectedYears = Math.min(LIFETIME_AGE_CAP - 10, MAX_DURATION_YEARS);
      expect(result.durationYears).toBe(expectedYears);
      expect(result.annualSchedule).toHaveLength(expectedYears);
    });

    it("clamps excessive custom years to MAX_DURATION_YEARS", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({
          duration: { type: "custom", years: 150 },
        }),
      );

      expect(result.durationYears).toBe(MAX_DURATION_YEARS);
      expect(result.annualSchedule).toHaveLength(MAX_DURATION_YEARS);
    });
  });

  // --------------------------------------------------------------------------
  // Partial survivor resources
  // --------------------------------------------------------------------------

  describe("partial survivor resources", () => {
    it("handles only govSurvivorBenefit set, rest default to 0", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({
          inflationRate: 0,
          discountRate: 0,
          duration: { type: "custom", years: 1 },
          survivorResources: {
            govSurvivorBenefit: 10_000,
            existingInsurance: 0,
            investmentIncome: 0,
            otherIncome: 0,
          },
        }),
      );

      expect(result.annualSchedule[0]!.survivorOffset).toBe(10_000);
    });

    it("handles only existingInsurance set", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({
          inflationRate: 0,
          discountRate: 0,
          duration: { type: "custom", years: 2 },
          survivorResources: {
            govSurvivorBenefit: 0,
            existingInsurance: 100_000,
            investmentIncome: 0,
            otherIncome: 0,
          },
        }),
      );

      // Year 1 gets lump sum, year 2 gets nothing
      expect(result.annualSchedule[0]!.survivorOffset).toBe(100_000);
      expect(result.annualSchedule[1]!.survivorOffset).toBe(0);
    });

    it("handles only investmentIncome and otherIncome set", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({
          inflationRate: 0,
          discountRate: 0,
          duration: { type: "custom", years: 2 },
          survivorResources: {
            govSurvivorBenefit: 0,
            existingInsurance: 0,
            investmentIncome: 5_000,
            otherIncome: 3_000,
          },
        }),
      );

      for (const entry of result.annualSchedule) {
        expect(entry.survivorOffset).toBe(8_000);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Stress test — high rates over long duration
  // --------------------------------------------------------------------------

  describe("stress tests", () => {
    it("produces finite results with high inflation over long duration", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({
          baseAnnualIncome: 100_000,
          replacementRatio: 0.7,
          inflationRate: 0.1,
          discountRate: 0.12,
          duration: { type: "custom", years: 50 },
        }),
      );

      expect(result.durationYears).toBe(50);
      expect(result.annualSchedule).toHaveLength(50);
      expect(Number.isFinite(result.presentValueTotal)).toBe(true);
      expect(Number.isFinite(result.netCoverageNeededPV)).toBe(true);
      expect(result.presentValueTotal).toBeGreaterThan(0);
    });

    it("works at maximum allowed rates (0.5)", () => {
      const result = calculateAdvancedIncomeReplacement(
        makeInput({
          inflationRate: 0.5,
          discountRate: 0.5,
          duration: { type: "custom", years: 10 },
        }),
      );

      expect(result.durationYears).toBe(10);
      expect(Number.isFinite(result.presentValueTotal)).toBe(true);
    });
  });
});
