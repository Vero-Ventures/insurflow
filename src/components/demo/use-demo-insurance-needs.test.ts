import { describe, expect, it } from "vitest";
import { calculateDemoInsuranceNeeds } from "./use-demo-insurance-needs";

describe("calculateDemoInsuranceNeeds", () => {
  it("calculates total needs from guided demo inputs", () => {
    const result = calculateDemoInsuranceNeeds({
      annualHouseholdIncome: "180000",
      totalDebts: "320000",
      currentCoverage: "250000",
      incomeReplacementPercent: 70,
      replacementDurationYears: 15,
      liquidAssets: 70000,
    });

    expect(result.totalInsuranceNeeds).toBe(1905000);
    expect(result.existingCoverage).toBe(250000);
  });
});
