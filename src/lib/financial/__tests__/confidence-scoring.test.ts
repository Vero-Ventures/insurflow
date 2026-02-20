import { describe, it, expect } from "vitest";
import {
  computeEstimateConfidence,
  type EstimateConfidenceInput,
  type EstimateCompleteness,
  type EstimateAssumptionsUsed,
} from "../confidence-scoring";

function fullCompleteness(): EstimateCompleteness {
  return {
    clientIncome: true,
    spouseIncome: true,
    incomeReplacementPercent: true,
    replacementDurationYears: true,
    existingCoverage: true,
    debtsData: true,
    assetsData: true,
    estateBuffer: true,
  };
}

function noAssumptions(): EstimateAssumptionsUsed {
  return {
    replacementDurationYears: false,
    estateBuffer: false,
    includeSpouseIncome: false,
  };
}

describe("computeEstimateConfidence", () => {
  it("returns High score and single positive reason when all data provided and no defaults", () => {
    const input: EstimateConfidenceInput = {
      completeness: fullCompleteness(),
      assumptionsUsed: noAssumptions(),
    };
    const result = computeEstimateConfidence(input);
    expect(result.score).toBe(100);
    expect(result.label).toBe("High");
    expect(result.reasons).toContain(
      "All key inputs provided and no defaults used",
    );
    expect(result.reasons.length).toBe(1);
  });

  it("reduces score for missing client income", () => {
    const input: EstimateConfidenceInput = {
      completeness: { ...fullCompleteness(), clientIncome: false },
      assumptionsUsed: noAssumptions(),
    };
    const result = computeEstimateConfidence(input);
    expect(result.score).toBe(90);
    expect(result.reasons).toContain("Client income is missing");
  });

  it("reduces score for each missing input", () => {
    const input: EstimateConfidenceInput = {
      completeness: {
        ...fullCompleteness(),
        clientIncome: false,
        assetsData: false,
      },
      assumptionsUsed: noAssumptions(),
    };
    const result = computeEstimateConfidence(input);
    expect(result.score).toBe(80);
    expect(result.reasons).toContain("Client income is missing");
    expect(result.reasons).toContain("Asset information is missing");
  });

  it("reduces score for each assumption used", () => {
    const input: EstimateConfidenceInput = {
      completeness: fullCompleteness(),
      assumptionsUsed: {
        replacementDurationYears: true,
        estateBuffer: false,
        includeSpouseIncome: false,
      },
    };
    const result = computeEstimateConfidence(input);
    expect(result.score).toBe(95);
    expect(result.reasons).toContain(
      "Using default replacement duration (10 years)",
    );
  });

  it("returns Medium label when score in 40–69 range", () => {
    const input: EstimateConfidenceInput = {
      completeness: {
        ...fullCompleteness(),
        clientIncome: false,
        spouseIncome: false,
        incomeReplacementPercent: false,
        replacementDurationYears: false,
        existingCoverage: false,
      },
      assumptionsUsed: noAssumptions(),
    };
    const result = computeEstimateConfidence(input);
    expect(result.score).toBe(50);
    expect(result.label).toBe("Medium");
  });

  it("returns Low label when score below 40", () => {
    const input: EstimateConfidenceInput = {
      completeness: {
        clientIncome: false,
        spouseIncome: false,
        incomeReplacementPercent: false,
        replacementDurationYears: false,
        existingCoverage: false,
        debtsData: false,
        assetsData: false,
        estateBuffer: false,
      },
      assumptionsUsed: {
        replacementDurationYears: true,
        estateBuffer: true,
        includeSpouseIncome: true,
      },
    };
    const result = computeEstimateConfidence(input);
    // 8 missing × 10 + 3 assumptions × 5 = 95 penalty → score 5
    expect(result.score).toBe(5);
    expect(result.label).toBe("Low");
    expect(result.reasons.length).toBeGreaterThan(1);
  });

  it("clamps score to 0–100", () => {
    const input: EstimateConfidenceInput = {
      completeness: {
        clientIncome: false,
        spouseIncome: false,
        incomeReplacementPercent: false,
        replacementDurationYears: false,
        existingCoverage: false,
        debtsData: false,
        assetsData: false,
        estateBuffer: false,
      },
      assumptionsUsed: {
        replacementDurationYears: true,
        estateBuffer: true,
        includeSpouseIncome: true,
      },
    };
    const result = computeEstimateConfidence(input);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.label).toBe("Low");
  });
});
