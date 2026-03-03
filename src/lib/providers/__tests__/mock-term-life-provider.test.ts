import { describe, expect, it } from "vitest";

import { getMockPremiumRangeMonthly } from "@/lib/providers/mock-term-life-provider";

describe("getMockPremiumRangeMonthly", () => {
  it("returns a non-binding CAD range", () => {
    const result = getMockPremiumRangeMonthly({
      age: 34,
      tobaccoUse: false,
      province: "ON",
      termYears: 20,
      coverageAmount: 500000,
    });

    expect(result.currency).toBe("CAD");
    expect(result.nonBinding).toBe(true);
    expect(result.highMonthlyPremiumCad).toBeGreaterThan(
      result.lowMonthlyPremiumCad,
    );
  });

  it("increases premiums as coverage increases", () => {
    const lowCoverage = getMockPremiumRangeMonthly({
      age: 34,
      tobaccoUse: false,
      province: "ON",
      termYears: 20,
      coverageAmount: 250000,
    });
    const highCoverage = getMockPremiumRangeMonthly({
      age: 34,
      tobaccoUse: false,
      province: "ON",
      termYears: 20,
      coverageAmount: 750000,
    });

    expect(highCoverage.lowMonthlyPremiumCad).toBeGreaterThan(
      lowCoverage.lowMonthlyPremiumCad,
    );
    expect(highCoverage.highMonthlyPremiumCad).toBeGreaterThan(
      lowCoverage.highMonthlyPremiumCad,
    );
  });
});
