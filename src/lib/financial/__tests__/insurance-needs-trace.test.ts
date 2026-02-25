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
});
