import { describe, it, expect } from "vitest";
import {
  calculatePremium,
  generateProductQuotes,
  calculateAffordableFaceAmount,
  estimatePremium,
  LOADING_FACTORS,
  FREQUENCY_FACTORS,
  PRODUCT_NAMES,
  PRODUCT_FEATURES,
  DEFAULT_TERM_YEARS,
  MAX_TERM_YEARS,
  ACTUARIAL_DISCOUNT_RATE,
  type PremiumInput,
} from "../actuarial-pricing";

// ============================================================================
// Test Fixtures
// ============================================================================

const baseInput: PremiumInput = {
  productType: "term_life",
  faceAmount: 500_000,
  age: 35,
  sex: "M",
  isSmoker: false,
  healthClass: "standard",
  termYears: 20,
};

// ============================================================================
// calculatePremium
// ============================================================================

describe("calculatePremium", () => {
  describe("basic calculations", () => {
    it("returns positive premium for valid input", () => {
      const result = calculatePremium(baseInput);

      expect(result.annualPremium).toBeGreaterThan(0);
      expect(result.monthlyPremium).toBeGreaterThan(0);
      expect(result.periodPremium).toBeGreaterThan(0);
    });

    it("returns monthly premium with modal loading factor", () => {
      const result = calculatePremium(baseInput);

      // Monthly premium uses FREQUENCY_FACTORS.monthly (0.0875) which includes
      // modal loading for administrative costs and lost interest
      expect(result.monthlyPremium).toBeCloseTo(
        result.annualPremium * 0.0875,
        1,
      );
    });

    it("includes correct payment frequency", () => {
      const result = calculatePremium(baseInput);
      expect(result.paymentFrequency).toBe("annual");

      const monthlyResult = calculatePremium({
        ...baseInput,
        paymentFrequency: "monthly",
      });
      expect(monthlyResult.paymentFrequency).toBe("monthly");
    });

    it("tracks inputs used for audit", () => {
      const result = calculatePremium(baseInput);

      expect(result.inputsUsed.productType).toBe("term_life");
      expect(result.inputsUsed.faceAmount).toBe(500_000);
      expect(result.inputsUsed.age).toBe(35);
      expect(result.inputsUsed.sex).toBe("M");
      expect(result.inputsUsed.isSmoker).toBe(false);
      expect(result.inputsUsed.healthClass).toBe("standard");
      expect(result.inputsUsed.termYears).toBe(20);
    });
  });

  describe("age impact", () => {
    it("increases premium for older ages", () => {
      const premium35 = calculatePremium({
        ...baseInput,
        age: 35,
      }).annualPremium;
      const premium45 = calculatePremium({
        ...baseInput,
        age: 45,
      }).annualPremium;
      const premium55 = calculatePremium({
        ...baseInput,
        age: 55,
      }).annualPremium;

      expect(premium45).toBeGreaterThan(premium35);
      expect(premium55).toBeGreaterThan(premium45);
    });

    it("clamps age to insurable range", () => {
      const resultYoung = calculatePremium({ ...baseInput, age: 15 });
      const result18 = calculatePremium({ ...baseInput, age: 18 });

      expect(resultYoung.inputsUsed.age).toBe(18);
      expect(resultYoung.annualPremium).toBe(result18.annualPremium);
    });
  });

  describe("sex impact", () => {
    it("returns higher premium for males", () => {
      const malePremium = calculatePremium({
        ...baseInput,
        sex: "M",
      }).annualPremium;
      const femalePremium = calculatePremium({
        ...baseInput,
        sex: "F",
      }).annualPremium;

      expect(malePremium).toBeGreaterThan(femalePremium);
    });
  });

  describe("smoking impact", () => {
    it("approximately doubles premium for smokers", () => {
      const nonSmokerPremium = calculatePremium({
        ...baseInput,
        isSmoker: false,
      }).annualPremium;
      const smokerPremium = calculatePremium({
        ...baseInput,
        isSmoker: true,
      }).annualPremium;

      // Smoker premium should be 1.5x - 2.5x non-smoker
      expect(smokerPremium).toBeGreaterThan(nonSmokerPremium * 1.5);
      expect(smokerPremium).toBeLessThan(nonSmokerPremium * 2.5);
    });

    it("adds smoker warning to metadata", () => {
      const result = calculatePremium({ ...baseInput, isSmoker: true });

      expect(result.metadata.warnings).toContain(
        "Smoker rates applied (approximately 2x non-smoker rates)",
      );
    });
  });

  describe("health class impact", () => {
    it("reduces premium for preferred health classes", () => {
      const standardPremium = calculatePremium({
        ...baseInput,
        healthClass: "standard",
      }).annualPremium;
      const preferredPremium = calculatePremium({
        ...baseInput,
        healthClass: "preferred",
      }).annualPremium;
      const preferredPlusPremium = calculatePremium({
        ...baseInput,
        healthClass: "preferred_plus",
      }).annualPremium;

      expect(preferredPremium).toBeLessThan(standardPremium);
      expect(preferredPlusPremium).toBeLessThan(preferredPremium);
    });

    it("increases premium for substandard health class", () => {
      const standardPremium = calculatePremium({
        ...baseInput,
        healthClass: "standard",
      }).annualPremium;
      const substandardPremium = calculatePremium({
        ...baseInput,
        healthClass: "substandard",
      }).annualPremium;

      expect(substandardPremium).toBeGreaterThan(standardPremium);
    });

    it("adds substandard warning to metadata", () => {
      const result = calculatePremium({
        ...baseInput,
        healthClass: "substandard",
      });

      expect(result.metadata.warnings).toContain(
        "Substandard health rating increases premium by ~50%",
      );
    });
  });

  describe("face amount impact", () => {
    it("scales premium with face amount", () => {
      const premium500k = calculatePremium({
        ...baseInput,
        faceAmount: 500_000,
      }).annualPremium;
      const premium1m = calculatePremium({
        ...baseInput,
        faceAmount: 1_000_000,
      }).annualPremium;

      // Premium should scale approximately linearly
      expect(premium1m).toBeCloseTo(premium500k * 2, -2);
    });

    it("handles zero face amount", () => {
      const result = calculatePremium({ ...baseInput, faceAmount: 0 });

      expect(result.annualPremium).toBe(0);
    });

    it("handles negative face amount by clamping to 0", () => {
      const result = calculatePremium({ ...baseInput, faceAmount: -100_000 });

      expect(result.annualPremium).toBe(0);
    });
  });

  describe("product types", () => {
    it("calculates term life with term years", () => {
      const result = calculatePremium({
        ...baseInput,
        productType: "term_life",
        termYears: 20,
      });

      expect(result.inputsUsed.termYears).toBe(20);
      expect(
        result.metadata.assumptions.some((a) =>
          a.includes("Policy term: 20 years"),
        ),
      ).toBe(true);
    });

    it("calculates whole life (no term)", () => {
      const result = calculatePremium({
        ...baseInput,
        productType: "whole_life",
      });

      expect(result.inputsUsed.termYears).toBeNull();
      expect(result.annualPremium).toBeGreaterThan(0);
    });

    it("calculates universal life", () => {
      const result = calculatePremium({
        ...baseInput,
        productType: "universal_life",
      });

      expect(result.annualPremium).toBeGreaterThan(0);
      expect(result.metadata.description).toContain("Universal Life");
    });

    it("calculates variable life", () => {
      const result = calculatePremium({
        ...baseInput,
        productType: "variable_life",
      });

      expect(result.annualPremium).toBeGreaterThan(0);
      expect(result.metadata.description).toContain("Variable Life");
    });

    it("term life is cheapest, permanent products are more expensive", () => {
      const termPremium = calculatePremium({
        ...baseInput,
        productType: "term_life",
      }).annualPremium;
      const wholePremium = calculatePremium({
        ...baseInput,
        productType: "whole_life",
      }).annualPremium;
      const ulPremium = calculatePremium({
        ...baseInput,
        productType: "universal_life",
      }).annualPremium;

      expect(termPremium).toBeLessThan(wholePremium);
      expect(termPremium).toBeLessThan(ulPremium);
    });
  });

  describe("loading factors", () => {
    it("applies correct loading factor", () => {
      const result = calculatePremium(baseInput);

      expect(result.loadingFactor).toBe(LOADING_FACTORS.term_life);
    });

    it("includes loading factor in metadata", () => {
      const result = calculatePremium(baseInput);
      const loadingPercent = (LOADING_FACTORS.term_life - 1) * 100;

      expect(result.metadata.assumptions).toContainEqual(
        expect.stringContaining(`Loading factor: ${loadingPercent}%`),
      );
    });
  });

  describe("payment frequency", () => {
    it("calculates period premium for monthly", () => {
      const result = calculatePremium({
        ...baseInput,
        paymentFrequency: "monthly",
      });

      const expectedMonthlyFactor = FREQUENCY_FACTORS.monthly;
      expect(result.periodPremium).toBeCloseTo(
        result.annualPremium * expectedMonthlyFactor,
        2,
      );
    });

    it("calculates period premium for quarterly", () => {
      const result = calculatePremium({
        ...baseInput,
        paymentFrequency: "quarterly",
      });

      const expectedQuarterlyFactor = FREQUENCY_FACTORS.quarterly;
      expect(result.periodPremium).toBeCloseTo(
        result.annualPremium * expectedQuarterlyFactor,
        2,
      );
    });
  });

  describe("metadata", () => {
    it("includes all required assumptions", () => {
      const result = calculatePremium(baseInput);

      expect(result.metadata.assumptions.length).toBeGreaterThan(5);
      expect(result.metadata.assumptions).toContainEqual(
        expect.stringContaining("Face amount"),
      );
      expect(result.metadata.assumptions).toContainEqual(
        expect.stringContaining("Issue age"),
      );
      expect(result.metadata.assumptions).toContainEqual(
        expect.stringContaining("Sex"),
      );
    });

    it("adds age warning for elderly applicants", () => {
      const result = calculatePremium({ ...baseInput, age: 75 });

      expect(result.metadata.warnings).toContain(
        "Premium rates are significantly higher for ages 70+",
      );
    });
  });
});

// ============================================================================
// generateProductQuotes
// ============================================================================

describe("generateProductQuotes", () => {
  const quoteInput = {
    faceAmount: 500_000,
    age: 40,
    sex: "M" as const,
    isSmoker: false,
    healthClass: "standard" as const,
    termYears: 20,
  };

  it("generates quotes for all product types", () => {
    const quotes = generateProductQuotes(quoteInput);

    expect(quotes.length).toBe(4);
    expect(quotes.map((q) => q.productType)).toContain("term_life");
    expect(quotes.map((q) => q.productType)).toContain("whole_life");
    expect(quotes.map((q) => q.productType)).toContain("universal_life");
    expect(quotes.map((q) => q.productType)).toContain("variable_life");
  });

  it("sorts quotes by annual premium (lowest first)", () => {
    const quotes = generateProductQuotes(quoteInput);

    for (let i = 1; i < quotes.length; i++) {
      const current = quotes[i];
      const previous = quotes[i - 1];
      if (current && previous) {
        expect(current.annualPremium).toBeGreaterThanOrEqual(
          previous.annualPremium,
        );
      }
    }
  });

  it("calculates cost per thousand", () => {
    const quotes = generateProductQuotes(quoteInput);

    for (const quote of quotes) {
      const expectedCostPerThousand =
        quote.annualPremium / (quoteInput.faceAmount / 1000);
      expect(quote.costPerThousand).toBeCloseTo(expectedCostPerThousand, 2);
    }
  });

  it("includes product features", () => {
    const quotes = generateProductQuotes(quoteInput);

    for (const quote of quotes) {
      expect(quote.features.length).toBeGreaterThan(0);
      expect(quote.features).toEqual(PRODUCT_FEATURES[quote.productType]);
    }
  });

  it("calculates total premium cost over term", () => {
    const quotes = generateProductQuotes(quoteInput);
    const termQuote = quotes.find((q) => q.productType === "term_life")!;

    expect(termQuote.totalPremiumCost).toBeCloseTo(
      termQuote.annualPremium * termQuote.termYears!,
      2,
    );
  });

  it("filters to specific product types when provided", () => {
    const quotes = generateProductQuotes(quoteInput, [
      "term_life",
      "whole_life",
    ]);

    expect(quotes.length).toBe(2);
    expect(quotes.map((q) => q.productType)).toContain("term_life");
    expect(quotes.map((q) => q.productType)).toContain("whole_life");
  });
});

// ============================================================================
// calculateAffordableFaceAmount
// ============================================================================

describe("calculateAffordableFaceAmount", () => {
  const affordabilityInput = {
    productType: "term_life" as const,
    age: 35,
    sex: "M" as const,
    isSmoker: false,
    healthClass: "standard" as const,
    termYears: 20,
  };

  it("returns face amount that fits within budget", () => {
    const budget = 500;
    const faceAmount = calculateAffordableFaceAmount(
      budget,
      affordabilityInput,
    );

    const result = calculatePremium({
      ...affordabilityInput,
      faceAmount,
    });

    expect(result.annualPremium).toBeLessThanOrEqual(budget);
  });

  it("returns higher face amount for higher budget", () => {
    const lowBudget = calculateAffordableFaceAmount(300, affordabilityInput);
    const highBudget = calculateAffordableFaceAmount(1000, affordabilityInput);

    expect(highBudget).toBeGreaterThan(lowBudget);
  });

  it("rounds to nearest $10,000", () => {
    const faceAmount = calculateAffordableFaceAmount(500, affordabilityInput);

    expect(faceAmount % 10_000).toBe(0);
  });

  it("returns lower amount for smokers (same budget)", () => {
    const nonSmokerAmount = calculateAffordableFaceAmount(
      500,
      affordabilityInput,
    );
    const smokerAmount = calculateAffordableFaceAmount(500, {
      ...affordabilityInput,
      isSmoker: true,
    });

    expect(smokerAmount).toBeLessThan(nonSmokerAmount);
  });
});

// ============================================================================
// estimatePremium
// ============================================================================

describe("estimatePremium", () => {
  it("returns estimated annual premium", () => {
    const estimate = estimatePremium(500_000, 35, "M", false, "term_life");

    expect(estimate).toBeGreaterThan(0);
  });

  it("uses standard health class", () => {
    const estimate = estimatePremium(500_000, 35, "M", false, "term_life");
    const fullCalc = calculatePremium({
      productType: "term_life",
      faceAmount: 500_000,
      age: 35,
      sex: "M",
      isSmoker: false,
      healthClass: "standard",
      termYears: 20,
    });

    expect(estimate).toBe(fullCalc.annualPremium);
  });

  it("defaults to term_life if not specified", () => {
    const estimate = estimatePremium(500_000, 35, "M", false);
    const termCalc = calculatePremium({
      productType: "term_life",
      faceAmount: 500_000,
      age: 35,
      sex: "M",
      isSmoker: false,
      healthClass: "standard",
      termYears: 20,
    });

    expect(estimate).toBe(termCalc.annualPremium);
  });
});

// ============================================================================
// Constants
// ============================================================================

describe("actuarial pricing constants", () => {
  it("has correct default term years", () => {
    expect(DEFAULT_TERM_YEARS).toBe(20);
  });

  it("has correct max term years", () => {
    expect(MAX_TERM_YEARS).toBe(40);
  });

  it("has correct actuarial discount rate", () => {
    expect(ACTUARIAL_DISCOUNT_RATE).toBe(0.04);
  });

  it("has loading factors for all product types", () => {
    expect(LOADING_FACTORS.term_life).toBeDefined();
    expect(LOADING_FACTORS.whole_life).toBeDefined();
    expect(LOADING_FACTORS.universal_life).toBeDefined();
    expect(LOADING_FACTORS.variable_life).toBeDefined();
  });

  it("has product names for all product types", () => {
    expect(PRODUCT_NAMES.term_life).toBe("Term Life Insurance");
    expect(PRODUCT_NAMES.whole_life).toBe("Whole Life Insurance");
    expect(PRODUCT_NAMES.universal_life).toBe("Universal Life Insurance");
    expect(PRODUCT_NAMES.variable_life).toBe("Variable Life Insurance");
  });
});
