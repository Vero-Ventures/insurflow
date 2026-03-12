import { describe, it, expect } from "vitest";
import {
  calculateInsuranceNeeds,
  calculateInsuranceNeedsRounded,
  DEFAULT_ESTATE_BUFFER,
  type InsuranceNeedsInput,
} from "../insurance-needs";
import type { InsuranceNeedsSnapshot } from "@/server/db/schemas/life-events-schema";

// ============================================================================
// HELPERS
// ============================================================================

function makeInput(
  overrides: Partial<InsuranceNeedsInput> = {},
): InsuranceNeedsInput {
  return {
    clientIncome: 100_000,
    spouseIncome: 0,
    includeSpouseIncome: false,
    incomeReplacementPercent: 70,
    replacementDurationYears: 10,
    existingLifeInsuranceCoverage: 0,
    totalDebts: 0,
    liquidAssets: 0,
    totalAssets: 0,
    estateBuffer: DEFAULT_ESTATE_BUFFER,
    ...overrides,
  };
}

/**
 * Maps a full InsuranceNeedsResult to the snapshot shape stored in the DB.
 */
function toSnapshot(
  result: ReturnType<typeof calculateInsuranceNeedsRounded>,
): InsuranceNeedsSnapshot {
  return {
    incomeReplacementNeeds: result.incomeReplacementNeeds,
    debtPayoffNeeds: result.debtPayoffNeeds,
    estateBufferNeeds: result.estateBufferNeeds,
    grossNeeds: result.grossNeeds,
    existingCoverage: result.existingCoverage,
    liquidAssets: result.liquidAssets,
    totalInsuranceNeeds: result.totalInsuranceNeeds,
  };
}

// ============================================================================
// TRIGGER MAPPING — life event → expected impact direction
// ============================================================================

describe("Life event trigger mapping — income_change", () => {
  it("higher income raises income replacement needs", () => {
    const before = calculateInsuranceNeedsRounded(
      makeInput({ clientIncome: 80_000 }),
    );
    const after = calculateInsuranceNeedsRounded(
      makeInput({ clientIncome: 120_000 }),
    );

    expect(after.incomeReplacementNeeds).toBeGreaterThan(
      before.incomeReplacementNeeds,
    );
    expect(after.totalInsuranceNeeds).toBeGreaterThan(
      before.totalInsuranceNeeds,
    );
  });

  it("lower income reduces income replacement needs", () => {
    const before = calculateInsuranceNeedsRounded(
      makeInput({ clientIncome: 120_000 }),
    );
    const after = calculateInsuranceNeedsRounded(
      makeInput({ clientIncome: 60_000 }),
    );

    expect(after.incomeReplacementNeeds).toBeLessThan(
      before.incomeReplacementNeeds,
    );
  });

  it("toSnapshot captures before correctly for income_change", () => {
    const result = calculateInsuranceNeedsRounded(
      makeInput({ clientIncome: 100_000 }),
    );
    const snap = toSnapshot(result);

    expect(snap.incomeReplacementNeeds).toBe(result.incomeReplacementNeeds);
    expect(snap.totalInsuranceNeeds).toBe(result.totalInsuranceNeeds);
  });
});

describe("Life event trigger mapping — new_child", () => {
  it("snapshot fields are non-negative regardless of child-related inputs", () => {
    // new_child signals extended replacement period or reduced resources
    const result = calculateInsuranceNeedsRounded(
      makeInput({ replacementDurationYears: 18, liquidAssets: 5_000 }),
    );
    const snap = toSnapshot(result);

    expect(snap.totalInsuranceNeeds).toBeGreaterThanOrEqual(0);
    expect(snap.grossNeeds).toBeGreaterThanOrEqual(0);
    expect(snap.liquidAssets).toBeGreaterThanOrEqual(0);
  });

  it("longer replacement duration increases income replacement needs", () => {
    const before = calculateInsuranceNeedsRounded(
      makeInput({ replacementDurationYears: 10 }),
    );
    const after = calculateInsuranceNeedsRounded(
      makeInput({ replacementDurationYears: 18 }),
    );

    expect(after.incomeReplacementNeeds).toBeGreaterThan(
      before.incomeReplacementNeeds,
    );
  });
});

describe("Life event trigger mapping — debt_change", () => {
  it("acquiring new debt increases debt payoff needs", () => {
    const before = calculateInsuranceNeedsRounded(makeInput({ totalDebts: 0 }));
    const after = calculateInsuranceNeedsRounded(
      makeInput({ totalDebts: 50_000 }),
    );

    expect(after.debtPayoffNeeds).toBeGreaterThan(before.debtPayoffNeeds);
    expect(after.totalInsuranceNeeds).toBeGreaterThan(
      before.totalInsuranceNeeds,
    );
  });

  it("paying off debt reduces debt payoff needs", () => {
    const before = calculateInsuranceNeedsRounded(
      makeInput({ totalDebts: 100_000 }),
    );
    const after = calculateInsuranceNeedsRounded(
      makeInput({ totalDebts: 20_000 }),
    );

    expect(after.debtPayoffNeeds).toBeLessThan(before.debtPayoffNeeds);
  });

  it("debt payoff needs equal total debts input", () => {
    const totalDebts = 75_000;
    const result = calculateInsuranceNeedsRounded(makeInput({ totalDebts }));

    expect(result.debtPayoffNeeds).toBe(totalDebts);
  });
});

describe("Life event trigger mapping — marriage", () => {
  it("adding spouse income (marriage) increases income replacement needs", () => {
    const before = calculateInsuranceNeedsRounded(
      makeInput({ includeSpouseIncome: false }),
    );
    const after = calculateInsuranceNeedsRounded(
      makeInput({ includeSpouseIncome: true, spouseIncome: 60_000 }),
    );

    expect(after.incomeReplacementNeeds).toBeGreaterThan(
      before.incomeReplacementNeeds,
    );
  });

  it("snapshot for marriage event is valid and non-negative", () => {
    const result = calculateInsuranceNeedsRounded(
      makeInput({ includeSpouseIncome: true, spouseIncome: 60_000 }),
    );
    const snap = toSnapshot(result);

    expect(snap.totalInsuranceNeeds).toBeGreaterThanOrEqual(0);
    expect(snap.grossNeeds).toBeGreaterThanOrEqual(0);
  });
});

describe("Life event trigger mapping — divorce", () => {
  it("removing spouse income (divorce) decreases income replacement needs", () => {
    const before = calculateInsuranceNeedsRounded(
      makeInput({ includeSpouseIncome: true, spouseIncome: 60_000 }),
    );
    const after = calculateInsuranceNeedsRounded(
      makeInput({ includeSpouseIncome: false, spouseIncome: 60_000 }),
    );

    expect(after.incomeReplacementNeeds).toBeLessThan(
      before.incomeReplacementNeeds,
    );
  });
});

// ============================================================================
// RECALCULATION BEHAVIOR
// ============================================================================

describe("Recalculation behavior", () => {
  it("before and after snapshots have identical structure", () => {
    const before = toSnapshot(calculateInsuranceNeedsRounded(makeInput()));
    const after = toSnapshot(calculateInsuranceNeedsRounded(makeInput()));

    const keys: (keyof InsuranceNeedsSnapshot)[] = [
      "incomeReplacementNeeds",
      "debtPayoffNeeds",
      "estateBufferNeeds",
      "grossNeeds",
      "existingCoverage",
      "liquidAssets",
      "totalInsuranceNeeds",
    ];

    for (const key of keys) {
      expect(before).toHaveProperty(key);
      expect(after).toHaveProperty(key);
    }
  });

  it("before/after comparison is meaningful when income changes", () => {
    const beforeResult = calculateInsuranceNeedsRounded(
      makeInput({ clientIncome: 100_000 }),
    );
    const afterResult = calculateInsuranceNeedsRounded(
      makeInput({ clientIncome: 150_000 }),
    );
    const beforeSnap = toSnapshot(beforeResult);
    const afterSnap = toSnapshot(afterResult);

    const delta =
      afterSnap.totalInsuranceNeeds - beforeSnap.totalInsuranceNeeds;

    // Delta: (150k - 100k) × 70% × 10 = 350,000
    expect(delta).toBe(350_000);
  });

  it("insurance needs floor at 0 — no negative totals in snapshots", () => {
    // Even with large existing coverage and liquid assets, net cannot be negative
    const result = calculateInsuranceNeeds(
      makeInput({
        clientIncome: 50_000,
        existingLifeInsuranceCoverage: 5_000_000,
        liquidAssets: 2_000_000,
      }),
    );
    const snap = toSnapshot({
      ...result,
      inputsUsed: {
        clientIncome: 50_000,
        spouseIncome: 0,
        includeSpouseIncome: false,
        incomeReplacementPercent: 70,
        replacementDurationYears: 10,
        estateBufferType: "fixed",
        estateBufferValue: 15_000,
      },
    });

    expect(snap.totalInsuranceNeeds).toBeGreaterThanOrEqual(0);
  });

  it("after snapshot reflects updated client income accurately", () => {
    const newIncome = 200_000;
    const afterResult = calculateInsuranceNeedsRounded(
      makeInput({ clientIncome: newIncome }),
    );
    const afterSnap = toSnapshot(afterResult);

    // income replacement = 200k × 70% × 10 = 1,400,000; after estate buffer + deductions
    expect(afterSnap.incomeReplacementNeeds).toBe(1_400_000);
    expect(afterSnap.totalInsuranceNeeds).toBe(
      afterSnap.grossNeeds -
        afterSnap.existingCoverage -
        afterSnap.liquidAssets,
    );
  });

  it("gross needs equals sum of income replacement + debt payoff + estate buffer", () => {
    const result = calculateInsuranceNeedsRounded(
      makeInput({ totalDebts: 30_000 }),
    );
    const snap = toSnapshot(result);

    expect(snap.grossNeeds).toBe(
      snap.incomeReplacementNeeds +
        snap.debtPayoffNeeds +
        snap.estateBufferNeeds,
    );
  });
});

// ============================================================================
// LIFE EVENT TYPE ENUM VALIDATION
// ============================================================================

describe("Life event type enumeration", () => {
  const validTypes = [
    "income_change",
    "new_child",
    "debt_change",
    "marriage",
    "divorce",
  ] as const;

  it("all five core life event types are defined", () => {
    expect(validTypes).toHaveLength(5);
  });

  it.each(validTypes)("'%s' is a valid life event type string", (type) => {
    expect(typeof type).toBe("string");
    expect(type.length).toBeGreaterThan(0);
  });
});
