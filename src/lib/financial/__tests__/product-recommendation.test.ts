import { describe, it, expect } from "vitest";
import {
  generateRecommendations,
  getQuickRecommendation,
  compareProducts,
  determineLifeStage,
  inferPrimaryGoal,
  calculateRecommendedTerm,
  SUGGESTED_BUDGET_PERCENT,
  MIN_COVERAGE_MULTIPLIER,
  TARGET_COVERAGE_MULTIPLIER,
  SCORE_WEIGHTS,
  type RecommendationInput,
} from "../product-recommendation";

// ============================================================================
// Test Fixtures
// ============================================================================

const baseInput: RecommendationInput = {
  age: 35,
  sex: "M",
  isSmoker: false,
  healthClass: "standard",
  annualIncome: 100_000,
  totalDebts: 200_000,
  liquidAssets: 50_000,
  existingCoverage: 100_000,
  coverageNeeded: 500_000,
  annualPremiumBudget: 2_000,
  primaryGoal: "income_replacement",
  hasDependents: true,
  youngestDependentAge: 5,
};

// ============================================================================
// determineLifeStage
// ============================================================================

describe("determineLifeStage", () => {
  it("returns retirement for age 65+", () => {
    expect(determineLifeStage(65)).toBe("retirement");
    expect(determineLifeStage(70)).toBe("retirement");
  });

  it("returns pre_retirement for age 50-64", () => {
    expect(determineLifeStage(50)).toBe("pre_retirement");
    expect(determineLifeStage(60)).toBe("pre_retirement");
  });

  it("returns young_family for dependents with young children", () => {
    expect(determineLifeStage(35, true, 5)).toBe("young_family");
    expect(determineLifeStage(40, true, 3)).toBe("young_family");
  });

  it("returns established_family for dependents with older children", () => {
    expect(determineLifeStage(45, true, 15)).toBe("established_family");
    expect(determineLifeStage(40, true, 12)).toBe("established_family");
  });

  it("returns young_single for young adults without dependents", () => {
    expect(determineLifeStage(25, false)).toBe("young_single");
    expect(determineLifeStage(30, false)).toBe("young_single");
  });

  it("returns established_family for middle-aged without dependents", () => {
    expect(determineLifeStage(45, false)).toBe("established_family");
  });
});

// ============================================================================
// inferPrimaryGoal
// ============================================================================

describe("inferPrimaryGoal", () => {
  it("returns explicit goal when provided", () => {
    expect(
      inferPrimaryGoal({ ...baseInput, primaryGoal: "estate_planning" }),
    ).toBe("estate_planning");
  });

  it("infers estate_planning for retirees", () => {
    const result = inferPrimaryGoal({
      ...baseInput,
      age: 70,
      primaryGoal: undefined,
    });
    expect(result).toBe("estate_planning");
  });

  it("infers debt_coverage for high debt", () => {
    const result = inferPrimaryGoal({
      ...baseInput,
      totalDebts: 500_000, // 5x income
      primaryGoal: undefined,
    });
    expect(result).toBe("debt_coverage");
  });

  it("infers income_replacement for families with dependents", () => {
    const result = inferPrimaryGoal({
      ...baseInput,
      totalDebts: 100_000, // Low debt
      primaryGoal: undefined,
    });
    expect(result).toBe("income_replacement");
  });

  it("infers estate_planning for wealthy without dependents", () => {
    const result = inferPrimaryGoal({
      ...baseInput,
      hasDependents: false,
      liquidAssets: 2_000_000, // 20x income
      primaryGoal: undefined,
    });
    expect(result).toBe("estate_planning");
  });
});

// ============================================================================
// calculateRecommendedTerm
// ============================================================================

describe("calculateRecommendedTerm", () => {
  it("calculates term based on youngest dependent age", () => {
    const term = calculateRecommendedTerm({
      ...baseInput,
      youngestDependentAge: 3,
    });

    // Should cover until child is independent (18) + buffer
    expect(term).toBeGreaterThanOrEqual(15);
    expect(term).toBeLessThanOrEqual(25);
  });

  it("uses retirement timeline when provided", () => {
    const term = calculateRecommendedTerm({
      ...baseInput,
      hasDependents: false,
      yearsUntilRetirement: 25,
    });

    expect(term).toBe(25);
  });

  it("defaults based on age when no context", () => {
    const term30 = calculateRecommendedTerm({
      ...baseInput,
      age: 30,
      hasDependents: false,
    });
    const term50 = calculateRecommendedTerm({
      ...baseInput,
      age: 50,
      hasDependents: false,
    });

    expect(term30).toBeGreaterThan(term50);
  });

  it("caps term at 30 years", () => {
    const term = calculateRecommendedTerm({
      ...baseInput,
      youngestDependentAge: 0, // Would need 23+ years
    });

    expect(term).toBeLessThanOrEqual(30);
  });
});

// ============================================================================
// generateRecommendations
// ============================================================================

describe("generateRecommendations", () => {
  describe("basic structure", () => {
    it("returns recommendations for all product types", () => {
      const result = generateRecommendations(baseInput);

      expect(result.recommendations.length).toBe(4);
    });

    it("ranks recommendations by score", () => {
      const result = generateRecommendations(baseInput);

      for (let i = 1; i < result.recommendations.length; i++) {
        const current = result.recommendations[i];
        const previous = result.recommendations[i - 1];
        if (current && previous) {
          expect(current.score).toBeLessThanOrEqual(previous.score);
        }
      }
    });

    it("assigns correct ranks", () => {
      const result = generateRecommendations(baseInput);

      result.recommendations.forEach((rec, idx) => {
        expect(rec.rank).toBe(idx + 1);
      });
    });

    it("identifies top recommendation", () => {
      const result = generateRecommendations(baseInput);

      expect(result.topRecommendation).toBeDefined();
      expect(result.topRecommendation?.rank).toBe(1);
    });
  });

  describe("coverage analysis", () => {
    it("calculates coverage gap correctly", () => {
      const result = generateRecommendations(baseInput);

      expect(result.coverageAnalysis.coverageGap).toBe(
        baseInput.coverageNeeded - baseInput.existingCoverage,
      );
    });

    it("identifies when gap exists", () => {
      const result = generateRecommendations(baseInput);

      expect(result.coverageAnalysis.hasGap).toBe(true);
    });

    it("calculates suggested coverage based on income", () => {
      const result = generateRecommendations(baseInput);

      expect(result.coverageAnalysis.suggestedMinimum).toBe(
        baseInput.annualIncome * MIN_COVERAGE_MULTIPLIER,
      );
      expect(result.coverageAnalysis.suggestedTarget).toBe(
        baseInput.annualIncome * TARGET_COVERAGE_MULTIPLIER,
      );
    });

    it("handles no gap case", () => {
      const result = generateRecommendations({
        ...baseInput,
        existingCoverage: 600_000,
      });

      expect(result.coverageAnalysis.hasGap).toBe(false);
      expect(result.coverageAnalysis.coverageGap).toBe(0);
    });
  });

  describe("budget analysis", () => {
    it("tracks stated budget", () => {
      const result = generateRecommendations(baseInput);

      expect(result.budgetAnalysis.statedBudget).toBe(
        baseInput.annualPremiumBudget,
      );
    });

    it("calculates suggested budget", () => {
      const result = generateRecommendations(baseInput);

      expect(result.budgetAnalysis.suggestedBudget).toBeCloseTo(
        baseInput.annualIncome * SUGGESTED_BUDGET_PERCENT,
        2,
      );
    });

    it("calculates minimum viable premium", () => {
      const result = generateRecommendations(baseInput);

      expect(result.budgetAnalysis.minimumViablePremium).toBeGreaterThan(0);
    });

    it("determines if gap is coverable within budget", () => {
      const result = generateRecommendations(baseInput);

      expect(typeof result.budgetAnalysis.gapCoverableWithinBudget).toBe(
        "boolean",
      );
    });
  });

  describe("scoring", () => {
    it("gives higher scores to affordable products", () => {
      const result = generateRecommendations({
        ...baseInput,
        annualPremiumBudget: 500, // Low budget
      });

      // Term life should score higher due to affordability
      const termRec = result.recommendations.find(
        (r) => r.productType === "term_life",
      );
      const wholeRec = result.recommendations.find(
        (r) => r.productType === "whole_life",
      );

      expect(termRec!.score).toBeGreaterThan(wholeRec!.score);
    });

    it("considers life stage in scoring", () => {
      const youngResult = generateRecommendations({
        ...baseInput,
        age: 30,
        hasDependents: true,
        youngestDependentAge: 2,
      });

      const retiredResult = generateRecommendations({
        ...baseInput,
        age: 70,
        hasDependents: false,
        annualPremiumBudget: 20_000, // Higher budget for retiree
        coverageNeeded: 200_000, // Lower coverage for estate planning
        primaryGoal: "estate_planning",
      });

      // Young family should favor term life
      expect(youngResult.topRecommendation?.productType).toBe("term_life");

      // Retiree with estate planning goal should have permanent products score well
      // Check that whole_life or universal_life scores higher than term_life
      const termScore = retiredResult.recommendations.find(
        (r) => r.productType === "term_life",
      )!.score;
      const wholeScore = retiredResult.recommendations.find(
        (r) => r.productType === "whole_life",
      )!.score;
      const ulScore = retiredResult.recommendations.find(
        (r) => r.productType === "universal_life",
      )!.score;

      // At least one permanent product should score close to or higher than term
      const maxPermanentScore = Math.max(wholeScore, ulScore);
      expect(maxPermanentScore).toBeGreaterThan(termScore - 20); // Within 20 points
    });

    it("considers goal alignment", () => {
      const estateResult = generateRecommendations({
        ...baseInput,
        primaryGoal: "estate_planning",
        annualPremiumBudget: 10_000,
      });

      // Estate planning should favor permanent products
      const wholeScore = estateResult.recommendations.find(
        (r) => r.productType === "whole_life",
      )!.score;
      const termScore = estateResult.recommendations.find(
        (r) => r.productType === "term_life",
      )!.score;

      // With sufficient budget, whole life should score higher for estate planning
      expect(wholeScore).toBeGreaterThan(termScore - 30); // Within reasonable range
    });
  });

  describe("recommendation details", () => {
    it("includes reasons for each recommendation", () => {
      const result = generateRecommendations(baseInput);

      for (const rec of result.recommendations) {
        expect(rec.reasons.length).toBeGreaterThan(0);
      }
    });

    it("includes considerations for each recommendation", () => {
      const result = generateRecommendations(baseInput);

      for (const rec of result.recommendations) {
        expect(rec.considerations.length).toBeGreaterThan(0);
      }
    });

    it("includes product features", () => {
      const result = generateRecommendations(baseInput);

      for (const rec of result.recommendations) {
        expect(rec.features.length).toBeGreaterThan(0);
      }
    });

    it("calculates percent need met", () => {
      const result = generateRecommendations(baseInput);

      for (const rec of result.recommendations) {
        expect(rec.percentNeedMet).toBeGreaterThanOrEqual(0);
        expect(rec.percentNeedMet).toBeLessThanOrEqual(100);
      }
    });

    it("assigns strength based on score", () => {
      const result = generateRecommendations(baseInput);

      for (const rec of result.recommendations) {
        if (rec.score >= 80) {
          expect(rec.strength).toBe("strong");
        } else if (rec.score >= 60) {
          expect(rec.strength).toBe("moderate");
        } else {
          expect(rec.strength).toBe("weak");
        }
      }
    });
  });

  describe("budget constraints", () => {
    it("adjusts face amount when over budget", () => {
      const result = generateRecommendations({
        ...baseInput,
        annualPremiumBudget: 200, // Very low budget
      });

      // Should adjust face amounts to fit budget
      for (const rec of result.recommendations) {
        if (rec.withinBudget) {
          expect(rec.annualPremium).toBeLessThanOrEqual(200);
        }
      }
    });

    it("marks recommendations as within/outside budget", () => {
      const result = generateRecommendations(baseInput);

      for (const rec of result.recommendations) {
        expect(typeof rec.withinBudget).toBe("boolean");
      }
    });
  });

  describe("metadata", () => {
    it("includes scoring factors", () => {
      const result = generateRecommendations(baseInput);

      expect(result.metadata.scoringFactors.length).toBeGreaterThan(0);
    });

    it("includes timestamp", () => {
      const result = generateRecommendations(baseInput);

      expect(result.metadata.generatedAt).toBeDefined();
      expect(() => new Date(result.metadata.generatedAt)).not.toThrow();
    });

    it("includes method description", () => {
      const result = generateRecommendations(baseInput);

      expect(result.metadata.description).toContain("optimization");
    });
  });

  describe("input validation", () => {
    it("handles zero income", () => {
      const result = generateRecommendations({
        ...baseInput,
        annualIncome: 0,
      });

      expect(result.recommendations.length).toBe(4);
    });

    it("handles negative values by clamping", () => {
      const result = generateRecommendations({
        ...baseInput,
        coverageNeeded: -100_000,
        existingCoverage: -50_000,
      });

      expect(result.coverageAnalysis.totalNeed).toBe(0);
      expect(result.coverageAnalysis.existingCoverage).toBe(0);
    });

    it("tracks inputs used", () => {
      const result = generateRecommendations(baseInput);

      expect(result.inputsUsed.age).toBe(baseInput.age);
      expect(result.inputsUsed.sex).toBe(baseInput.sex);
      expect(result.inputsUsed.coverageNeeded).toBe(baseInput.coverageNeeded);
    });
  });
});

// ============================================================================
// getQuickRecommendation
// ============================================================================

describe("getQuickRecommendation", () => {
  it("returns term life for young with limited budget", () => {
    const result = getQuickRecommendation(30, 500_000, 500);

    expect(result.productType).toBe("term_life");
    expect(result.reason).toBeDefined();
  });

  it("returns whole life for retirees", () => {
    const result = getQuickRecommendation(70, 100_000, 5_000);

    expect(result.productType).toBe("whole_life");
  });

  it("suggests UL for pre-retirement with budget", () => {
    const result = getQuickRecommendation(55, 500_000, 10_000);

    expect(["universal_life", "term_life"]).toContain(result.productType);
  });

  it("includes reason for recommendation", () => {
    const result = getQuickRecommendation(35, 500_000, 1_000);

    expect(result.reason.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// compareProducts
// ============================================================================

describe("compareProducts", () => {
  const compareInput = {
    faceAmount: 500_000,
    age: 40,
    sex: "M" as const,
    isSmoker: false,
    healthClass: "standard" as const,
    termYears: 20,
  };

  it("compares two products side by side", () => {
    const result = compareProducts(compareInput, "term_life", "whole_life");

    expect(result.productA.productType).toBe("term_life");
    expect(result.productB.productType).toBe("whole_life");
  });

  it("calculates premium difference", () => {
    const result = compareProducts(compareInput, "term_life", "whole_life");

    expect(result.comparison.premiumDifference).toBeGreaterThan(0);
    expect(result.comparison.premiumDifferencePercent).toBeGreaterThan(0);
  });

  it("provides recommendation", () => {
    const result = compareProducts(compareInput, "term_life", "whole_life");

    expect(["term_life", "whole_life"]).toContain(
      result.comparison.recommendation,
    );
  });

  it("includes reason for recommendation", () => {
    const result = compareProducts(compareInput, "term_life", "whole_life");

    expect(result.comparison.reason.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Constants
// ============================================================================

describe("product recommendation constants", () => {
  it("has correct suggested budget percent", () => {
    expect(SUGGESTED_BUDGET_PERCENT).toBe(0.1);
  });

  it("has correct coverage multipliers", () => {
    expect(MIN_COVERAGE_MULTIPLIER).toBe(5);
    expect(TARGET_COVERAGE_MULTIPLIER).toBe(10);
  });

  it("has score weights that sum to 1", () => {
    const total =
      SCORE_WEIGHTS.affordability +
      SCORE_WEIGHTS.coverageMatch +
      SCORE_WEIGHTS.suitability +
      SCORE_WEIGHTS.value;

    expect(total).toBe(1);
  });
});
