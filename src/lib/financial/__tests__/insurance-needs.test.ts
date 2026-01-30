import { describe, it, expect } from "vitest";
import {
  calculateIncomeReplacementNeeds,
  calculateEstateBufferNeeds,
  calculateInsuranceNeeds,
  calculateInsuranceNeedsRounded,
  roundCurrency,
  DEFAULT_ESTATE_BUFFER,
  type InsuranceNeedsInput,
  type EstateBufferConfig,
} from "../insurance-needs";

describe("calculateIncomeReplacementNeeds", () => {
  it("calculates basic income replacement correctly", () => {
    const result = calculateIncomeReplacementNeeds(
      100000, // client income
      undefined, // no spouse income
      false, // don't include spouse
      70, // 70% replacement
      10, // 10 years
    );
    // 100000 * 0.70 * 10 = 700000
    expect(result).toBe(700000);
  });

  it("includes spouse income when toggle is enabled", () => {
    const result = calculateIncomeReplacementNeeds(
      100000, // client income
      50000, // spouse income
      true, // include spouse
      70, // 70% replacement
      10, // 10 years
    );
    // (100000 + 50000) * 0.70 * 10 = 1050000
    expect(result).toBe(1050000);
  });

  it("ignores spouse income when toggle is disabled", () => {
    const result = calculateIncomeReplacementNeeds(
      100000, // client income
      50000, // spouse income provided but...
      false, // don't include spouse
      70, // 70% replacement
      10, // 10 years
    );
    // Should only use client income
    expect(result).toBe(700000);
  });

  it("handles undefined spouse income gracefully", () => {
    const result = calculateIncomeReplacementNeeds(
      100000,
      undefined,
      true, // toggle enabled but no spouse income
      70,
      10,
    );
    expect(result).toBe(700000);
  });

  it("handles zero values correctly", () => {
    expect(calculateIncomeReplacementNeeds(0, 0, true, 70, 10)).toBe(0);
    expect(calculateIncomeReplacementNeeds(100000, 0, true, 0, 10)).toBe(0);
    expect(calculateIncomeReplacementNeeds(100000, 0, true, 70, 0)).toBe(0);
  });

  it("clamps negative values to zero", () => {
    const result = calculateIncomeReplacementNeeds(
      -100000, // negative client income
      -50000, // negative spouse income
      true,
      70,
      10,
    );
    expect(result).toBe(0);
  });

  it("clamps replacement percent to 0-100 range", () => {
    // Over 100%
    const over = calculateIncomeReplacementNeeds(
      100000,
      undefined,
      false,
      150,
      10,
    );
    expect(over).toBe(1000000); // clamped to 100%

    // Negative percent
    const negative = calculateIncomeReplacementNeeds(
      100000,
      undefined,
      false,
      -50,
      10,
    );
    expect(negative).toBe(0);
  });

  it("handles fractional percentages", () => {
    const result = calculateIncomeReplacementNeeds(
      100000,
      undefined,
      false,
      66.67, // 66.67%
      10,
    );
    // 100000 * 0.6667 * 10 = 666700
    expect(result).toBeCloseTo(666700, 0);
  });
});

describe("calculateEstateBufferNeeds", () => {
  it("calculates fixed estate buffer correctly", () => {
    const config: EstateBufferConfig = { type: "fixed", amount: 15000 };
    const result = calculateEstateBufferNeeds(config, 500000);
    expect(result).toBe(15000);
  });

  it("calculates percentage-based estate buffer correctly", () => {
    const config: EstateBufferConfig = { type: "percentage", percentage: 3 };
    const result = calculateEstateBufferNeeds(config, 500000);
    // 500000 * 0.03 = 15000
    expect(result).toBe(15000);
  });

  it("handles zero total assets for percentage buffer", () => {
    const config: EstateBufferConfig = { type: "percentage", percentage: 5 };
    const result = calculateEstateBufferNeeds(config, 0);
    expect(result).toBe(0);
  });

  it("clamps negative fixed amount to zero", () => {
    const config: EstateBufferConfig = { type: "fixed", amount: -5000 };
    const result = calculateEstateBufferNeeds(config, 500000);
    expect(result).toBe(0);
  });

  it("clamps percentage to 0-100 range", () => {
    const overConfig: EstateBufferConfig = {
      type: "percentage",
      percentage: 150,
    };
    const over = calculateEstateBufferNeeds(overConfig, 100000);
    expect(over).toBe(100000); // 100% of assets

    const negativeConfig: EstateBufferConfig = {
      type: "percentage",
      percentage: -10,
    };
    const negative = calculateEstateBufferNeeds(negativeConfig, 100000);
    expect(negative).toBe(0);
  });

  it("handles negative total assets by treating as zero", () => {
    const config: EstateBufferConfig = { type: "percentage", percentage: 5 };
    const result = calculateEstateBufferNeeds(config, -100000);
    expect(result).toBe(0);
  });
});

describe("calculateInsuranceNeeds", () => {
  const baseInput: InsuranceNeedsInput = {
    clientIncome: 100000,
    spouseIncome: 50000,
    includeSpouseIncome: false,
    incomeReplacementPercent: 70,
    replacementDurationYears: 10,
    existingLifeInsuranceCoverage: 100000,
    totalDebts: 250000,
    liquidAssets: 50000,
    totalAssets: 500000,
    estateBuffer: { type: "fixed", amount: 15000 },
  };

  it("calculates all components correctly for basic case", () => {
    const result = calculateInsuranceNeeds(baseInput);

    // Income replacement: 100000 * 0.70 * 10 = 700000
    expect(result.incomeReplacementNeeds).toBe(700000);

    // Debt payoff: 250000
    expect(result.debtPayoffNeeds).toBe(250000);

    // Estate buffer: 15000 (fixed)
    expect(result.estateBufferNeeds).toBe(15000);

    // Gross: 700000 + 250000 + 15000 = 965000
    expect(result.grossNeeds).toBe(965000);

    // Deductions
    expect(result.existingCoverage).toBe(100000);
    expect(result.liquidAssets).toBe(50000);

    // Net: 965000 - 100000 - 50000 = 815000
    expect(result.totalInsuranceNeeds).toBe(815000);
  });

  it("includes spouse income when toggle is enabled", () => {
    const input: InsuranceNeedsInput = {
      ...baseInput,
      includeSpouseIncome: true,
    };
    const result = calculateInsuranceNeeds(input);

    // Income replacement: (100000 + 50000) * 0.70 * 10 = 1050000
    expect(result.incomeReplacementNeeds).toBe(1050000);

    // Gross: 1050000 + 250000 + 15000 = 1315000
    expect(result.grossNeeds).toBe(1315000);

    // Net: 1315000 - 100000 - 50000 = 1165000
    expect(result.totalInsuranceNeeds).toBe(1165000);
  });

  it("uses percentage-based estate buffer correctly", () => {
    const input: InsuranceNeedsInput = {
      ...baseInput,
      estateBuffer: { type: "percentage", percentage: 3 },
    };
    const result = calculateInsuranceNeeds(input);

    // Estate buffer: 500000 * 0.03 = 15000
    expect(result.estateBufferNeeds).toBe(15000);
  });

  it("floors total insurance needs at zero", () => {
    const input: InsuranceNeedsInput = {
      ...baseInput,
      existingLifeInsuranceCoverage: 1000000, // More than gross needs
      liquidAssets: 500000,
    };
    const result = calculateInsuranceNeeds(input);

    expect(result.totalInsuranceNeeds).toBe(0);
  });

  it("handles zero income scenario (e.g., retired client)", () => {
    const input: InsuranceNeedsInput = {
      ...baseInput,
      clientIncome: 0,
      spouseIncome: 0,
    };
    const result = calculateInsuranceNeeds(input);

    expect(result.incomeReplacementNeeds).toBe(0);
    // Still has debt and estate needs
    expect(result.grossNeeds).toBe(265000); // 250000 + 15000
    expect(result.totalInsuranceNeeds).toBe(115000); // 265000 - 100000 - 50000
  });

  it("handles zero debts scenario", () => {
    const input: InsuranceNeedsInput = {
      ...baseInput,
      totalDebts: 0,
    };
    const result = calculateInsuranceNeeds(input);

    expect(result.debtPayoffNeeds).toBe(0);
    expect(result.grossNeeds).toBe(715000); // 700000 + 0 + 15000
  });

  it("includes correct inputs used in result", () => {
    const result = calculateInsuranceNeeds(baseInput);

    expect(result.inputsUsed).toEqual({
      clientIncome: 100000,
      spouseIncome: 50000,
      includeSpouseIncome: false,
      incomeReplacementPercent: 70,
      replacementDurationYears: 10,
      estateBufferType: "fixed",
      estateBufferValue: 15000,
    });
  });

  it("handles percentage estate buffer in inputsUsed", () => {
    const input: InsuranceNeedsInput = {
      ...baseInput,
      estateBuffer: { type: "percentage", percentage: 5 },
    };
    const result = calculateInsuranceNeeds(input);

    expect(result.inputsUsed.estateBufferType).toBe("percentage");
    expect(result.inputsUsed.estateBufferValue).toBe(5);
  });

  it("handles undefined spouse income in inputsUsed", () => {
    const input: InsuranceNeedsInput = {
      ...baseInput,
      spouseIncome: undefined,
    };
    const result = calculateInsuranceNeeds(input);

    expect(result.inputsUsed.spouseIncome).toBe(0);
  });
});

describe("roundCurrency", () => {
  it("rounds to 2 decimal places", () => {
    expect(roundCurrency(100.456)).toBe(100.46);
    expect(roundCurrency(100.454)).toBe(100.45);
    expect(roundCurrency(100)).toBe(100);
    expect(roundCurrency(100.1)).toBe(100.1);
  });

  it("handles edge cases", () => {
    expect(roundCurrency(0)).toBe(0);
    expect(roundCurrency(-100.456)).toBe(-100.46);
  });
});

describe("calculateInsuranceNeedsRounded", () => {
  it("returns all values rounded to 2 decimal places", () => {
    const input: InsuranceNeedsInput = {
      clientIncome: 100000,
      spouseIncome: undefined,
      includeSpouseIncome: false,
      incomeReplacementPercent: 66.67, // Will produce fractional results
      replacementDurationYears: 10,
      existingLifeInsuranceCoverage: 100000,
      totalDebts: 250000,
      liquidAssets: 50000,
      totalAssets: 500000,
      estateBuffer: { type: "percentage", percentage: 3.33 },
    };

    const result = calculateInsuranceNeedsRounded(input);

    // All numeric values should be properly rounded
    expect(Number.isInteger(result.incomeReplacementNeeds * 100)).toBe(true);
    expect(Number.isInteger(result.estateBufferNeeds * 100)).toBe(true);
    expect(Number.isInteger(result.grossNeeds * 100)).toBe(true);
    expect(Number.isInteger(result.totalInsuranceNeeds * 100)).toBe(true);
  });
});

describe("DEFAULT_ESTATE_BUFFER", () => {
  it("is a fixed $15,000 buffer", () => {
    expect(DEFAULT_ESTATE_BUFFER).toEqual({
      type: "fixed",
      amount: 15000,
    });
  });
});

describe("real-world scenarios", () => {
  it("calculates needs for young family with mortgage", () => {
    const input: InsuranceNeedsInput = {
      clientIncome: 85000,
      spouseIncome: 65000,
      includeSpouseIncome: true,
      incomeReplacementPercent: 70,
      replacementDurationYears: 20, // Until kids are grown
      existingLifeInsuranceCoverage: 250000, // Basic work policy
      totalDebts: 450000, // Mortgage + car loans
      liquidAssets: 25000, // Emergency fund
      totalAssets: 600000, // House equity + savings
      estateBuffer: { type: "fixed", amount: 20000 },
    };

    const result = calculateInsuranceNeeds(input);

    // Income: (85000 + 65000) * 0.70 * 20 = 2,100,000
    expect(result.incomeReplacementNeeds).toBe(2100000);
    // Gross: 2,100,000 + 450,000 + 20,000 = 2,570,000
    expect(result.grossNeeds).toBe(2570000);
    // Net: 2,570,000 - 250,000 - 25,000 = 2,295,000
    expect(result.totalInsuranceNeeds).toBe(2295000);
  });

  it("calculates needs for near-retirement professional", () => {
    const input: InsuranceNeedsInput = {
      clientIncome: 150000,
      spouseIncome: 0,
      includeSpouseIncome: false,
      incomeReplacementPercent: 60,
      replacementDurationYears: 5, // Until retirement
      existingLifeInsuranceCoverage: 500000,
      totalDebts: 100000, // Small remaining mortgage
      liquidAssets: 200000, // Substantial savings
      totalAssets: 1500000,
      estateBuffer: { type: "percentage", percentage: 2 },
    };

    const result = calculateInsuranceNeeds(input);

    // Income: 150000 * 0.60 * 5 = 450,000
    expect(result.incomeReplacementNeeds).toBe(450000);
    // Estate buffer: 1,500,000 * 0.02 = 30,000
    expect(result.estateBufferNeeds).toBe(30000);
    // Gross: 450,000 + 100,000 + 30,000 = 580,000
    expect(result.grossNeeds).toBe(580000);
    // Net: 580,000 - 500,000 - 200,000 = -120,000 -> 0
    expect(result.totalInsuranceNeeds).toBe(0);
  });

  it("calculates needs for single income household", () => {
    const input: InsuranceNeedsInput = {
      clientIncome: 75000,
      spouseIncome: undefined,
      includeSpouseIncome: false,
      incomeReplacementPercent: 80,
      replacementDurationYears: 15,
      existingLifeInsuranceCoverage: 0, // No coverage
      totalDebts: 300000,
      liquidAssets: 10000,
      totalAssets: 400000,
      estateBuffer: DEFAULT_ESTATE_BUFFER,
    };

    const result = calculateInsuranceNeeds(input);

    // Income: 75000 * 0.80 * 15 = 900,000
    expect(result.incomeReplacementNeeds).toBe(900000);
    // Gross: 900,000 + 300,000 + 15,000 = 1,215,000
    expect(result.grossNeeds).toBe(1215000);
    // Net: 1,215,000 - 0 - 10,000 = 1,205,000
    expect(result.totalInsuranceNeeds).toBe(1205000);
  });
});
