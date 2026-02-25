import { describe, expect, it } from "vitest";
import {
  calculateInsuranceNeedsRoundedWithTrace,
  calculateInsuranceNeedsWithTrace,
  INSURANCE_NEEDS_TRACE_SECTION_KEYS,
  type InsuranceNeedsInput,
} from "../insurance-needs";

const baseInput: InsuranceNeedsInput = {
  clientIncome: 125000,
  spouseIncome: undefined,
  includeSpouseIncome: true,
  incomeReplacementPercent: 70,
  replacementDurationYears: 10,
  existingLifeInsuranceCoverage: 250000,
  totalDebts: 300000,
  liquidAssets: 50000,
  totalAssets: 750000,
  estateBuffer: { type: "percentage", percentage: 2.5 },
};

describe("insurance needs trace schema consistency", () => {
  it("keeps section keys consistent across raw and rounded calculation flows", () => {
    const raw = calculateInsuranceNeedsWithTrace(baseInput).trace;
    const rounded = calculateInsuranceNeedsRoundedWithTrace(baseInput).trace;

    expect(raw.sections.map((section) => section.key)).toEqual([
      ...INSURANCE_NEEDS_TRACE_SECTION_KEYS,
    ]);
    expect(rounded.sections.map((section) => section.key)).toEqual([
      ...INSURANCE_NEEDS_TRACE_SECTION_KEYS,
    ]);
  });

  it("includes a version and required fields on sections/items", () => {
    const { trace } = calculateInsuranceNeedsWithTrace(baseInput);

    expect(typeof trace.version).toBe("string");
    expect(trace.version.length).toBeGreaterThan(0);

    for (const section of trace.sections) {
      expect(typeof section.key).toBe("string");
      expect(section.key.length).toBeGreaterThan(0);
      expect(typeof section.label).toBe("string");
      expect(Array.isArray(section.items)).toBe(true);

      for (const item of section.items) {
        expect(typeof item.key).toBe("string");
        expect(item.key.length).toBeGreaterThan(0);
        expect(typeof item.label).toBe("string");
        expect(["input", "assumption", "intermediate", "result"]).toContain(
          item.kind,
        );
        expect("value" in item).toBe(true);
      }
    }
  });

  it("preserves null values for missing optional inputs in both flows", () => {
    const rawIncomeSection = calculateInsuranceNeedsWithTrace(
      baseInput,
    ).trace.sections.find((section) => section.key === "income_replacement");
    const roundedIncomeSection = calculateInsuranceNeedsRoundedWithTrace(
      baseInput,
    ).trace.sections.find((section) => section.key === "income_replacement");

    expect(
      rawIncomeSection?.items.find((item) => item.key === "spouse_income")
        ?.value,
    ).toBeNull();
    expect(
      roundedIncomeSection?.items.find((item) => item.key === "spouse_income")
        ?.value,
    ).toBeNull();
  });

  it("maps trace section results from the same computed result values", () => {
    const { result, trace } = calculateInsuranceNeedsWithTrace(baseInput);

    const sectionResultByKey = Object.fromEntries(
      trace.sections.map((section) => [section.key, section.result]),
    );

    expect(sectionResultByKey.income_replacement).toBe(
      result.incomeReplacementNeeds,
    );
    expect(sectionResultByKey.debt_payoff).toBe(result.debtPayoffNeeds);
    expect(sectionResultByKey.estate_buffer).toBe(result.estateBufferNeeds);
    expect(sectionResultByKey.gross_needs).toBe(result.grossNeeds);
    expect(sectionResultByKey.net_needs).toBe(result.totalInsuranceNeeds);
  });

  it("keeps floored-net note and intermediate value aligned with computed output", () => {
    const input: InsuranceNeedsInput = {
      ...baseInput,
      existingLifeInsuranceCoverage: 2_000_000,
      liquidAssets: 500_000,
    };

    const { result, trace } = calculateInsuranceNeedsWithTrace(input);
    const netSection = trace.sections.find(
      (section) => section.key === "net_needs",
    );

    expect(result.totalInsuranceNeeds).toBe(0);
    expect(netSection?.notes).toEqual([
      "Net insurance needs are floored at zero.",
    ]);
    expect(
      netSection?.items.find((item) => item.key === "net_needs_before_floor")
        ?.value,
    ).toBeLessThan(0);
    expect(
      netSection?.items.find((item) => item.key === "total_insurance_needs")
        ?.value,
    ).toBe(result.totalInsuranceNeeds);
  });
});
