import { describe, it, expect } from "vitest";
import {
  getBaseMortalityRate,
  getAdjustedMortalityRate,
  getMortalityProbability,
  getSurvivalProbability,
  getCumulativeSurvivalProbability,
  getLifeExpectancy,
  toSmokingStatus,
  isInsurableAge,
  HEALTH_CLASS_FACTORS,
  type RiskProfile,
} from "../mortality-tables";
import { MIN_INSURABLE_AGE, MAX_INSURABLE_AGE } from "@/lib/constants";

// ============================================================================
// getBaseMortalityRate
// ============================================================================

describe("getBaseMortalityRate", () => {
  it("returns higher rates for older ages", () => {
    const rate30 = getBaseMortalityRate({
      age: 30,
      sex: "M",
      smokingStatus: "nonsmoker",
    });
    const rate50 = getBaseMortalityRate({
      age: 50,
      sex: "M",
      smokingStatus: "nonsmoker",
    });
    const rate70 = getBaseMortalityRate({
      age: 70,
      sex: "M",
      smokingStatus: "nonsmoker",
    });

    expect(rate50).toBeGreaterThan(rate30);
    expect(rate70).toBeGreaterThan(rate50);
  });

  it("returns higher rates for males than females", () => {
    const maleRate = getBaseMortalityRate({
      age: 40,
      sex: "M",
      smokingStatus: "nonsmoker",
    });
    const femaleRate = getBaseMortalityRate({
      age: 40,
      sex: "F",
      smokingStatus: "nonsmoker",
    });

    expect(maleRate).toBeGreaterThan(femaleRate);
  });

  it("returns approximately double rates for smokers", () => {
    const nonSmokerRate = getBaseMortalityRate({
      age: 45,
      sex: "M",
      smokingStatus: "nonsmoker",
    });
    const smokerRate = getBaseMortalityRate({
      age: 45,
      sex: "M",
      smokingStatus: "smoker",
    });

    // Smoker rates should be approximately 2x non-smoker
    expect(smokerRate).toBeCloseTo(nonSmokerRate * 2, 1);
  });

  it("interpolates between table ages", () => {
    // Age 32 should be between 30 and 35
    const rate30 = getBaseMortalityRate({
      age: 30,
      sex: "M",
      smokingStatus: "nonsmoker",
    });
    const rate32 = getBaseMortalityRate({
      age: 32,
      sex: "M",
      smokingStatus: "nonsmoker",
    });
    const rate35 = getBaseMortalityRate({
      age: 35,
      sex: "M",
      smokingStatus: "nonsmoker",
    });

    expect(rate32).toBeGreaterThan(rate30);
    expect(rate32).toBeLessThan(rate35);
  });

  it("clamps age to insurable range", () => {
    const rate15 = getBaseMortalityRate({
      age: 15,
      sex: "M",
      smokingStatus: "nonsmoker",
    });
    const rate18 = getBaseMortalityRate({
      age: 18,
      sex: "M",
      smokingStatus: "nonsmoker",
    });

    // Age 15 should clamp to 18
    expect(rate15).toBe(rate18);
  });

  it("returns exact table values for table ages", () => {
    const rate40 = getBaseMortalityRate({
      age: 40,
      sex: "M",
      smokingStatus: "nonsmoker",
    });

    // CSO 2017 value for 40-year-old male non-smoker is 1.21
    expect(rate40).toBe(1.21);
  });
});

// ============================================================================
// getAdjustedMortalityRate
// ============================================================================

describe("getAdjustedMortalityRate", () => {
  const baseProfile: RiskProfile = {
    age: 40,
    sex: "M",
    smokingStatus: "nonsmoker",
    healthClass: "standard",
  };

  it("returns base rate for standard health class", () => {
    const adjusted = getAdjustedMortalityRate(baseProfile);
    const base = getBaseMortalityRate({
      age: baseProfile.age,
      sex: baseProfile.sex,
      smokingStatus: baseProfile.smokingStatus,
    });

    expect(adjusted).toBe(base);
  });

  it("reduces rate for preferred_plus health class", () => {
    const standardRate = getAdjustedMortalityRate(baseProfile);
    const preferredPlusRate = getAdjustedMortalityRate({
      ...baseProfile,
      healthClass: "preferred_plus",
    });

    expect(preferredPlusRate).toBeLessThan(standardRate);
    expect(preferredPlusRate).toBeCloseTo(standardRate * 0.6, 5);
  });

  it("increases rate for substandard health class", () => {
    const standardRate = getAdjustedMortalityRate(baseProfile);
    const substandardRate = getAdjustedMortalityRate({
      ...baseProfile,
      healthClass: "substandard",
    });

    expect(substandardRate).toBeGreaterThan(standardRate);
    expect(substandardRate).toBeCloseTo(standardRate * 1.5, 5);
  });

  it("applies health class factors correctly", () => {
    const baseRate = getBaseMortalityRate({
      age: baseProfile.age,
      sex: baseProfile.sex,
      smokingStatus: baseProfile.smokingStatus,
    });

    for (const [healthClass, factor] of Object.entries(HEALTH_CLASS_FACTORS)) {
      const adjusted = getAdjustedMortalityRate({
        ...baseProfile,
        healthClass: healthClass as RiskProfile["healthClass"],
      });
      expect(adjusted).toBeCloseTo(baseRate * factor, 5);
    }
  });
});

// ============================================================================
// getMortalityProbability & getSurvivalProbability
// ============================================================================

describe("getMortalityProbability", () => {
  const profile: RiskProfile = {
    age: 40,
    sex: "M",
    smokingStatus: "nonsmoker",
    healthClass: "standard",
  };

  it("converts rate per 1000 to probability", () => {
    const qx = getMortalityProbability(profile);

    // Rate is 1.21 per 1000, so probability is 0.00121
    expect(qx).toBeCloseTo(0.00121, 5);
  });

  it("returns value between 0 and 1", () => {
    const qx = getMortalityProbability(profile);

    expect(qx).toBeGreaterThanOrEqual(0);
    expect(qx).toBeLessThanOrEqual(1);
  });
});

describe("getSurvivalProbability", () => {
  const profile: RiskProfile = {
    age: 40,
    sex: "M",
    smokingStatus: "nonsmoker",
    healthClass: "standard",
  };

  it("equals 1 - mortality probability", () => {
    const qx = getMortalityProbability(profile);
    const px = getSurvivalProbability(profile);

    expect(px).toBeCloseTo(1 - qx, 10);
  });

  it("is close to 1 for young healthy individuals", () => {
    const youngProfile: RiskProfile = {
      age: 25,
      sex: "F",
      smokingStatus: "nonsmoker",
      healthClass: "preferred_plus",
    };

    const px = getSurvivalProbability(youngProfile);
    expect(px).toBeGreaterThan(0.999);
  });
});

// ============================================================================
// getCumulativeSurvivalProbability
// ============================================================================

describe("getCumulativeSurvivalProbability", () => {
  const profile: RiskProfile = {
    age: 40,
    sex: "M",
    smokingStatus: "nonsmoker",
    healthClass: "standard",
  };

  it("returns 1 for 0 years", () => {
    const prob = getCumulativeSurvivalProbability(profile, 0);
    expect(prob).toBe(1);
  });

  it("decreases with more years", () => {
    const prob5 = getCumulativeSurvivalProbability(profile, 5);
    const prob10 = getCumulativeSurvivalProbability(profile, 10);
    const prob20 = getCumulativeSurvivalProbability(profile, 20);

    expect(prob10).toBeLessThan(prob5);
    expect(prob20).toBeLessThan(prob10);
  });

  it("is higher for healthier individuals", () => {
    const standardProb = getCumulativeSurvivalProbability(profile, 20);
    const preferredProb = getCumulativeSurvivalProbability(
      { ...profile, healthClass: "preferred_plus" },
      20,
    );

    expect(preferredProb).toBeGreaterThan(standardProb);
  });

  it("is lower for smokers", () => {
    const nonSmokerProb = getCumulativeSurvivalProbability(profile, 20);
    const smokerProb = getCumulativeSurvivalProbability(
      { ...profile, smokingStatus: "smoker" },
      20,
    );

    expect(smokerProb).toBeLessThan(nonSmokerProb);
  });
});

// ============================================================================
// getLifeExpectancy
// ============================================================================

describe("getLifeExpectancy", () => {
  it("returns higher life expectancy for younger individuals", () => {
    const le30 = getLifeExpectancy({
      age: 30,
      sex: "M",
      smokingStatus: "nonsmoker",
      healthClass: "standard",
    });
    const le50 = getLifeExpectancy({
      age: 50,
      sex: "M",
      smokingStatus: "nonsmoker",
      healthClass: "standard",
    });

    expect(le30).toBeGreaterThan(le50);
  });

  it("returns higher life expectancy for females", () => {
    const maleLE = getLifeExpectancy({
      age: 40,
      sex: "M",
      smokingStatus: "nonsmoker",
      healthClass: "standard",
    });
    const femaleLE = getLifeExpectancy({
      age: 40,
      sex: "F",
      smokingStatus: "nonsmoker",
      healthClass: "standard",
    });

    expect(femaleLE).toBeGreaterThan(maleLE);
  });

  it("returns lower life expectancy for smokers", () => {
    const nonSmokerLE = getLifeExpectancy({
      age: 40,
      sex: "M",
      smokingStatus: "nonsmoker",
      healthClass: "standard",
    });
    const smokerLE = getLifeExpectancy({
      age: 40,
      sex: "M",
      smokingStatus: "smoker",
      healthClass: "standard",
    });

    expect(smokerLE).toBeLessThan(nonSmokerLE);
  });

  it("returns reasonable life expectancy values", () => {
    const le = getLifeExpectancy({
      age: 40,
      sex: "M",
      smokingStatus: "nonsmoker",
      healthClass: "standard",
    });

    // 40-year-old male should have ~35-45 years remaining
    expect(le).toBeGreaterThan(30);
    expect(le).toBeLessThan(50);
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

describe("toSmokingStatus", () => {
  it("converts boolean to smoking status", () => {
    expect(toSmokingStatus(true)).toBe("smoker");
    expect(toSmokingStatus(false)).toBe("nonsmoker");
  });
});

describe("isInsurableAge", () => {
  it("returns true for ages within range", () => {
    expect(isInsurableAge(18)).toBe(true);
    expect(isInsurableAge(40)).toBe(true);
    expect(isInsurableAge(85)).toBe(true);
  });

  it("returns false for ages outside range", () => {
    expect(isInsurableAge(17)).toBe(false);
    expect(isInsurableAge(86)).toBe(false);
    expect(isInsurableAge(0)).toBe(false);
  });
});

// ============================================================================
// Constants
// ============================================================================

describe("mortality table constants", () => {
  it("has correct insurable age range", () => {
    expect(MIN_INSURABLE_AGE).toBe(18);
    expect(MAX_INSURABLE_AGE).toBe(85);
  });

  it("has correct health class factors", () => {
    expect(HEALTH_CLASS_FACTORS.preferred_plus).toBe(0.6);
    expect(HEALTH_CLASS_FACTORS.standard).toBe(1.0);
    expect(HEALTH_CLASS_FACTORS.substandard).toBe(1.5);
  });
});
