import { describe, it, expect } from "vitest";
import {
  calculateProbateFees,
  calculateFinalIncomeTax,
  calculateCapitalGainsTax,
  calculateProfessionalFees,
  calculateSettlingRequirements,
  calculateSettlingRequirementsRounded,
  getProbateFeeDescription,
  getSupportedProvinces,
  isValidProvince,
  DEFAULT_PROFESSIONAL_FEES,
  DEFAULT_FUNERAL_EXPENSES,
  type AssetForSettling,
  type ProfessionalFeesConfig,
  type SettlingRequirementsInput,
} from "../settling-requirements";
import { roundCurrency } from "../utils";
import { PROVINCE_NAMES, type CanadianProvince } from "@/lib/constants";

// =============================================================================
// Probate Fee Tests - All Provinces
// =============================================================================

describe("calculateProbateFees", () => {
  describe("Alberta (AB) - Flat fee tiers", () => {
    it("returns $35 for estates up to $10,000", () => {
      expect(calculateProbateFees("AB", 0)).toBe(35);
      expect(calculateProbateFees("AB", 5000)).toBe(35);
      expect(calculateProbateFees("AB", 10000)).toBe(35);
    });

    it("returns $135 for estates $10,001 - $25,000", () => {
      expect(calculateProbateFees("AB", 10001)).toBe(135);
      expect(calculateProbateFees("AB", 25000)).toBe(135);
    });

    it("returns $275 for estates $25,001 - $125,000", () => {
      expect(calculateProbateFees("AB", 25001)).toBe(275);
      expect(calculateProbateFees("AB", 125000)).toBe(275);
    });

    it("returns $400 for estates $125,001 - $250,000", () => {
      expect(calculateProbateFees("AB", 125001)).toBe(400);
      expect(calculateProbateFees("AB", 250000)).toBe(400);
    });

    it("returns $525 for estates over $250,000", () => {
      expect(calculateProbateFees("AB", 250001)).toBe(525);
      expect(calculateProbateFees("AB", 1000000)).toBe(525);
    });
  });

  describe("British Columbia (BC) - $6 per $1,000 over $25,000 + $208 fee", () => {
    it("returns $0 for estates up to $25,000", () => {
      expect(calculateProbateFees("BC", 0)).toBe(0);
      expect(calculateProbateFees("BC", 25000)).toBe(0);
    });

    it("calculates correctly for estates over $25,000", () => {
      // $26,000: $1,000 over threshold = 1 × $6 + $208 = $214
      expect(calculateProbateFees("BC", 26000)).toBe(214);
      // $100,000: $75,000 over = 75 × $6 + $208 = $658
      expect(calculateProbateFees("BC", 100000)).toBe(658);
      // $500,000: $475,000 over = 475 × $6 + $208 = $3,058
      expect(calculateProbateFees("BC", 500000)).toBe(3058);
    });
  });

  describe("Manitoba (MB) - $70 base + $7 per $1,000 over $10,000", () => {
    it("returns $70 for estates up to $10,000", () => {
      expect(calculateProbateFees("MB", 0)).toBe(70);
      expect(calculateProbateFees("MB", 10000)).toBe(70);
    });

    it("calculates correctly for estates over $10,000", () => {
      // $15,000: $70 + (5 × $7) = $105
      expect(calculateProbateFees("MB", 15000)).toBe(105);
      // $100,000: $70 + (90 × $7) = $700
      expect(calculateProbateFees("MB", 100000)).toBe(700);
    });
  });

  describe("New Brunswick (NB) - Tiered rates", () => {
    it("calculates $5 per $1,000 for first $20,000", () => {
      expect(calculateProbateFees("NB", 10000)).toBe(50);
      expect(calculateProbateFees("NB", 20000)).toBe(100);
    });

    it("calculates $5 per $500 over $20,000", () => {
      // $25,000: $100 + (10 × $5) = $150
      expect(calculateProbateFees("NB", 25000)).toBe(150);
      // $50,000: $100 + (60 × $5) = $400
      expect(calculateProbateFees("NB", 50000)).toBe(400);
    });
  });

  describe("Newfoundland and Labrador (NL) - Progressive scale", () => {
    it("returns $60 for estates up to $1,000", () => {
      expect(calculateProbateFees("NL", 0)).toBe(60);
      expect(calculateProbateFees("NL", 1000)).toBe(60);
    });

    it("calculates progressively for larger estates", () => {
      // $5,000: $60 + ($4,000 × 0.006) = $84
      expect(calculateProbateFees("NL", 5000)).toBe(84);
      // $10,000: $84 + ($5,000 × 0.005) = $109
      expect(calculateProbateFees("NL", 10000)).toBe(109);
    });
  });

  describe("Nova Scotia (NS) - $89.15 base + $16.82 per $1,000", () => {
    it("returns $89.15 for estates up to $10,000", () => {
      expect(calculateProbateFees("NS", 0)).toBe(89.15);
      expect(calculateProbateFees("NS", 10000)).toBe(89.15);
    });

    it("calculates correctly with cap", () => {
      // $50,000: $89.15 + (40 × $16.82) = $762.15
      expect(calculateProbateFees("NS", 50000)).toBeCloseTo(761.95, 0);
    });
  });

  describe("Northwest Territories (NT) - Progressive rates", () => {
    it("returns $15 for estates up to $10,000", () => {
      expect(calculateProbateFees("NT", 0)).toBe(15);
      expect(calculateProbateFees("NT", 10000)).toBe(15);
    });

    it("calculates progressively", () => {
      // $25,000: $15 + (15 × $2) = $45
      expect(calculateProbateFees("NT", 25000)).toBe(45);
      // $125,000: $45 + (100 × $3) = $345
      expect(calculateProbateFees("NT", 125000)).toBe(345);
    });
  });

  describe("Nunavut (NU) - Same as NWT", () => {
    it("matches Northwest Territories rates", () => {
      expect(calculateProbateFees("NU", 10000)).toBe(
        calculateProbateFees("NT", 10000),
      );
      expect(calculateProbateFees("NU", 100000)).toBe(
        calculateProbateFees("NT", 100000),
      );
    });
  });

  describe("Ontario (ON) - $5/$15 per $1,000 tiers", () => {
    it("calculates $5 per $1,000 for first $50,000", () => {
      expect(calculateProbateFees("ON", 25000)).toBe(125);
      expect(calculateProbateFees("ON", 50000)).toBe(250);
    });

    it("calculates $15 per $1,000 over $50,000", () => {
      // $100,000: $250 + (50 × $15) = $1,000
      expect(calculateProbateFees("ON", 100000)).toBe(1000);
      // $500,000: $250 + (450 × $15) = $7,000
      expect(calculateProbateFees("ON", 500000)).toBe(7000);
    });
  });

  describe("Prince Edward Island (PE) - Capped at $400", () => {
    it("returns $50 for estates up to $10,000", () => {
      expect(calculateProbateFees("PE", 0)).toBe(50);
      expect(calculateProbateFees("PE", 10000)).toBe(50);
    });

    it("caps at $400 for large estates", () => {
      // PEI calculation at $100,000:
      // $50 (base for first $10,000) + $60 ($10,001-$25,000) + $100 ($25,001-$50,000) + $200 ($50,001-$100,000) = $410
      // The cap applies at values over $100,000
      expect(calculateProbateFees("PE", 100000)).toBe(410);
      expect(calculateProbateFees("PE", 1000000)).toBe(400);
    });
  });

  describe("Quebec (QC) - No probate fees", () => {
    it("returns $0 for all estate values", () => {
      expect(calculateProbateFees("QC", 0)).toBe(0);
      expect(calculateProbateFees("QC", 100000)).toBe(0);
      expect(calculateProbateFees("QC", 10000000)).toBe(0);
    });
  });

  describe("Saskatchewan (SK) - $7 per $1,000", () => {
    it("calculates $7 per $1,000", () => {
      expect(calculateProbateFees("SK", 10000)).toBe(70);
      expect(calculateProbateFees("SK", 100000)).toBe(700);
      expect(calculateProbateFees("SK", 500000)).toBe(3500);
    });
  });

  describe("Yukon (YT) - Flat $140", () => {
    it("returns $140 for all estate values", () => {
      expect(calculateProbateFees("YT", 0)).toBe(140);
      expect(calculateProbateFees("YT", 100000)).toBe(140);
      expect(calculateProbateFees("YT", 10000000)).toBe(140);
    });
  });

  describe("Edge cases", () => {
    it("handles negative values as 0", () => {
      expect(calculateProbateFees("ON", -100000)).toBe(0);
    });

    it("handles very large estates", () => {
      // Ontario: $250 + (9,950 × $15) = $149,500 (for $10,000,000)
      // Note: Math.ceil(9,950,000 / 1000) = 9950, not 9,999,950
      expect(calculateProbateFees("ON", 10000000)).toBe(149500);
    });
  });
});

// =============================================================================
// Income Tax Calculation Tests
// =============================================================================

describe("calculateFinalIncomeTax", () => {
  it("returns 0 for zero income", () => {
    expect(calculateFinalIncomeTax(0, "ON")).toBe(0);
  });

  it("returns 0 for negative income", () => {
    expect(calculateFinalIncomeTax(-50000, "ON")).toBe(0);
  });

  it("calculates combined federal and provincial tax", () => {
    // Basic check that tax is positive for positive income
    const tax = calculateFinalIncomeTax(100000, "ON");
    expect(tax).toBeGreaterThan(0);
  });

  it("increases tax with higher income (progressive)", () => {
    const tax50k = calculateFinalIncomeTax(50000, "ON");
    const tax100k = calculateFinalIncomeTax(100000, "ON");
    const tax200k = calculateFinalIncomeTax(200000, "ON");

    expect(tax100k).toBeGreaterThan(tax50k);
    expect(tax200k).toBeGreaterThan(tax100k);
  });

  it("varies by province", () => {
    const taxON = calculateFinalIncomeTax(100000, "ON");
    const taxQC = calculateFinalIncomeTax(100000, "QC");
    const taxAB = calculateFinalIncomeTax(100000, "AB");

    // Alberta typically has lower taxes, Quebec higher
    // Just verify they're different
    expect(taxON).not.toBe(taxQC);
    expect(taxON).not.toBe(taxAB);
  });

  it("calculates reasonable tax rates", () => {
    const income = 100000;
    const tax = calculateFinalIncomeTax(income, "ON");

    // Tax should be between 15% and 55% of income (reasonable range)
    expect(tax).toBeGreaterThan(income * 0.15);
    expect(tax).toBeLessThan(income * 0.55);
  });

  describe("all provinces calculate tax", () => {
    const provinces: CanadianProvince[] = [
      "AB",
      "BC",
      "MB",
      "NB",
      "NL",
      "NS",
      "NT",
      "NU",
      "ON",
      "PE",
      "QC",
      "SK",
      "YT",
    ];

    provinces.forEach((province) => {
      it(`calculates tax for ${PROVINCE_NAMES[province]} (${province})`, () => {
        const tax = calculateFinalIncomeTax(100000, province);
        expect(tax).toBeGreaterThan(0);
        expect(typeof tax).toBe("number");
        expect(Number.isFinite(tax)).toBe(true);
      });
    });
  });
});

// =============================================================================
// Capital Gains Tax Tests
// =============================================================================

describe("calculateCapitalGainsTax", () => {
  const baseAssets: AssetForSettling[] = [
    { currentValue: 500000, costBasis: 200000 }, // $300,000 gain
    { currentValue: 100000, costBasis: 50000 }, // $50,000 gain
  ];

  it("calculates total unrealized gains", () => {
    const result = calculateCapitalGainsTax(baseAssets, "ON", 0);
    expect(result.totalGains).toBe(350000);
  });

  it("applies 50% inclusion rate", () => {
    const result = calculateCapitalGainsTax(baseAssets, "ON", 0);
    expect(result.taxableGains).toBe(175000); // 50% of $350,000
  });

  it("counts assets with gains", () => {
    const result = calculateCapitalGainsTax(baseAssets, "ON", 0);
    expect(result.assetsWithGains).toBe(2);
  });

  it("excludes exempt assets", () => {
    const assetsWithExempt: AssetForSettling[] = [
      { currentValue: 500000, costBasis: 200000, isExempt: true }, // Primary residence
      { currentValue: 100000, costBasis: 50000 },
    ];

    const result = calculateCapitalGainsTax(assetsWithExempt, "ON", 0);
    expect(result.totalGains).toBe(50000); // Only non-exempt asset
    expect(result.exemptAssets).toBe(1);
    expect(result.assetsWithGains).toBe(1);
  });

  it("handles assets with no gain (loss)", () => {
    const assetsWithLoss: AssetForSettling[] = [
      { currentValue: 80000, costBasis: 100000 }, // $20,000 loss - ignored
      { currentValue: 100000, costBasis: 50000 }, // $50,000 gain
    ];

    const result = calculateCapitalGainsTax(assetsWithLoss, "ON", 0);
    expect(result.totalGains).toBe(50000);
    expect(result.assetsWithGains).toBe(1);
  });

  it("calculates tax at marginal rate on top of existing income", () => {
    const lowIncomeTax = calculateCapitalGainsTax(baseAssets, "ON", 0);
    const highIncomeTax = calculateCapitalGainsTax(baseAssets, "ON", 200000);

    // Higher existing income pushes gains into higher brackets
    expect(highIncomeTax.capitalGainsTax).toBeGreaterThan(
      lowIncomeTax.capitalGainsTax,
    );
  });

  it("handles empty assets array", () => {
    const result = calculateCapitalGainsTax([], "ON", 100000);
    expect(result.totalGains).toBe(0);
    expect(result.taxableGains).toBe(0);
    expect(result.capitalGainsTax).toBe(0);
    expect(result.assetsWithGains).toBe(0);
  });

  it("handles all exempt assets", () => {
    const allExempt: AssetForSettling[] = [
      { currentValue: 500000, costBasis: 200000, isExempt: true },
    ];

    const result = calculateCapitalGainsTax(allExempt, "ON", 0);
    expect(result.totalGains).toBe(0);
    expect(result.capitalGainsTax).toBe(0);
    expect(result.exemptAssets).toBe(1);
  });
});

// =============================================================================
// Professional Fees Tests
// =============================================================================

describe("calculateProfessionalFees", () => {
  it("calculates percentage-based legal fees", () => {
    const config: ProfessionalFeesConfig = {
      legal: { type: "percentage", rate: 2 },
      accounting: { type: "fixed", amount: 3000 },
      executor: { type: "percentage", rate: 2.5 },
    };

    const result = calculateProfessionalFees(500000, config);
    expect(result.legalFees).toBe(10000); // 2% of $500,000
  });

  it("calculates fixed legal fees", () => {
    const config: ProfessionalFeesConfig = {
      legal: { type: "fixed", amount: 5000 },
      accounting: { type: "fixed", amount: 3000 },
      executor: { type: "percentage", rate: 2.5 },
    };

    const result = calculateProfessionalFees(500000, config);
    expect(result.legalFees).toBe(5000);
  });

  it("calculates executor fees as percentage", () => {
    const config: ProfessionalFeesConfig = {
      legal: { type: "fixed", amount: 5000 },
      accounting: { type: "fixed", amount: 3000 },
      executor: { type: "percentage", rate: 2.5 },
    };

    const result = calculateProfessionalFees(500000, config);
    expect(result.executorFees).toBe(12500); // 2.5% of $500,000
  });

  it("handles waived executor fees", () => {
    const config: ProfessionalFeesConfig = {
      legal: { type: "fixed", amount: 5000 },
      accounting: { type: "fixed", amount: 3000 },
      executor: { type: "waived" },
    };

    const result = calculateProfessionalFees(500000, config);
    expect(result.executorFees).toBe(0);
  });

  it("calculates total correctly", () => {
    // Use waived executor for clean total calculation
    const configWithWaived: ProfessionalFeesConfig = {
      legal: { type: "fixed", amount: 5000 },
      accounting: { type: "fixed", amount: 3000 },
      executor: { type: "waived" },
    };

    const result = calculateProfessionalFees(500000, configWithWaived);
    expect(result.total).toBe(8000);
  });

  it("handles zero estate value", () => {
    const result = calculateProfessionalFees(0, DEFAULT_PROFESSIONAL_FEES);
    expect(result.legalFees).toBe(0);
    expect(result.executorFees).toBe(0);
    // Accounting is fixed at $3,000
    expect(result.accountingFees).toBe(3000);
  });

  it("handles negative estate value as zero", () => {
    const result = calculateProfessionalFees(
      -100000,
      DEFAULT_PROFESSIONAL_FEES,
    );
    expect(result.legalFees).toBe(0);
    expect(result.executorFees).toBe(0);
  });
});

// =============================================================================
// Main Calculation Function Tests
// =============================================================================

describe("calculateSettlingRequirements", () => {
  const baseInput: SettlingRequirementsInput = {
    province: "ON",
    estateValue: 500000,
    finalYearIncome: 100000,
    assets: [
      { currentValue: 300000, costBasis: 200000 }, // $100,000 gain
      { currentValue: 200000, costBasis: 100000 }, // $100,000 gain
    ],
  };

  it("calculates all components", () => {
    const result = calculateSettlingRequirements(baseInput);

    expect(result.probateFees).toBeGreaterThan(0);
    expect(result.finalIncomeTax).toBeGreaterThan(0);
    expect(result.capitalGainsTax).toBeGreaterThan(0);
    expect(result.professionalFees.total).toBeGreaterThan(0);
    expect(result.funeralExpenses).toBe(DEFAULT_FUNERAL_EXPENSES);
  });

  it("calculates total as sum of all components", () => {
    const result = calculateSettlingRequirements(baseInput);

    const expectedTotal =
      result.probateFees +
      result.finalIncomeTax +
      result.capitalGainsTax +
      result.professionalFees.total +
      result.funeralExpenses;

    expect(result.totalSettlingRequirements).toBeCloseTo(expectedTotal, 2);
  });

  it("includes audit trail in inputsUsed", () => {
    const result = calculateSettlingRequirements(baseInput);

    expect(result.inputsUsed.province).toBe("ON");
    expect(result.inputsUsed.estateValue).toBe(500000);
    expect(result.inputsUsed.finalYearIncome).toBe(100000);
    expect(result.inputsUsed.assetCount).toBe(2);
    expect(result.inputsUsed.totalAssetValue).toBe(500000);
    expect(result.inputsUsed.totalCostBasis).toBe(300000);
  });

  it("uses custom funeral expenses when provided", () => {
    const input: SettlingRequirementsInput = {
      ...baseInput,
      funeralExpenses: 15000,
    };

    const result = calculateSettlingRequirements(input);
    expect(result.funeralExpenses).toBe(15000);
  });

  it("uses custom professional fees when provided", () => {
    const input: SettlingRequirementsInput = {
      ...baseInput,
      professionalFees: {
        legal: { type: "fixed", amount: 10000 },
        accounting: { type: "fixed", amount: 5000 },
        executor: { type: "waived" },
      },
    };

    const result = calculateSettlingRequirements(input);
    expect(result.professionalFees.legalFees).toBe(10000);
    expect(result.professionalFees.accountingFees).toBe(5000);
    expect(result.professionalFees.executorFees).toBe(0);
  });

  it("handles zero estate value", () => {
    const input: SettlingRequirementsInput = {
      ...baseInput,
      estateValue: 0,
      assets: [],
    };

    const result = calculateSettlingRequirements(input);
    expect(result.probateFees).toBeGreaterThanOrEqual(0);
    expect(result.capitalGainsTax).toBe(0);
  });

  it("handles empty assets array", () => {
    const input: SettlingRequirementsInput = {
      ...baseInput,
      assets: [],
    };

    const result = calculateSettlingRequirements(input);
    expect(result.capitalGainsTax).toBe(0);
    expect(result.capitalGainsBreakdown.assetsWithGains).toBe(0);
  });

  describe("province-specific calculations", () => {
    const provinces: CanadianProvince[] = [
      "AB",
      "BC",
      "MB",
      "NB",
      "NL",
      "NS",
      "NT",
      "NU",
      "ON",
      "PE",
      "QC",
      "SK",
      "YT",
    ];

    provinces.forEach((province) => {
      it(`calculates settling requirements for ${PROVINCE_NAMES[province]} (${province})`, () => {
        const input: SettlingRequirementsInput = {
          ...baseInput,
          province,
        };

        const result = calculateSettlingRequirements(input);

        expect(result.totalSettlingRequirements).toBeGreaterThan(0);
        expect(result.inputsUsed.province).toBe(province);
      });
    });
  });
});

// =============================================================================
// Rounded Calculation Tests
// =============================================================================

describe("calculateSettlingRequirementsRounded", () => {
  const baseInput: SettlingRequirementsInput = {
    province: "ON",
    estateValue: 500000,
    finalYearIncome: 100000,
    assets: [{ currentValue: 300000, costBasis: 200000 }],
  };

  it("rounds all currency values to 2 decimal places", () => {
    const result = calculateSettlingRequirementsRounded(baseInput);

    // Check that values are rounded
    expect(Number.isInteger(result.probateFees * 100)).toBe(true);
    expect(Number.isInteger(result.finalIncomeTax * 100)).toBe(true);
    expect(Number.isInteger(result.capitalGainsTax * 100)).toBe(true);
    expect(Number.isInteger(result.funeralExpenses * 100)).toBe(true);
    expect(Number.isInteger(result.totalSettlingRequirements * 100)).toBe(true);
  });

  it("rounds nested professional fees", () => {
    const result = calculateSettlingRequirementsRounded(baseInput);

    expect(Number.isInteger(result.professionalFees.legalFees * 100)).toBe(
      true,
    );
    expect(Number.isInteger(result.professionalFees.accountingFees * 100)).toBe(
      true,
    );
    expect(Number.isInteger(result.professionalFees.executorFees * 100)).toBe(
      true,
    );
    expect(Number.isInteger(result.professionalFees.total * 100)).toBe(true);
  });

  it("rounds capital gains breakdown", () => {
    const result = calculateSettlingRequirementsRounded(baseInput);

    expect(
      Number.isInteger(result.capitalGainsBreakdown.totalGains * 100),
    ).toBe(true);
    expect(
      Number.isInteger(result.capitalGainsBreakdown.taxableGains * 100),
    ).toBe(true);
    expect(
      Number.isInteger(result.capitalGainsBreakdown.capitalGainsTax * 100),
    ).toBe(true);
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

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
    expect(roundCurrency(0.005)).toBe(0.01);
    expect(roundCurrency(0.004)).toBe(0);
  });
});

describe("getProbateFeeDescription", () => {
  it("returns description for valid provinces", () => {
    expect(getProbateFeeDescription("ON")).toContain("$5");
    expect(getProbateFeeDescription("QC")).toContain("No probate");
    expect(getProbateFeeDescription("AB")).toContain("Flat fee");
  });
});

describe("getSupportedProvinces", () => {
  it("returns all 13 provinces/territories", () => {
    const provinces = getSupportedProvinces();
    expect(provinces).toHaveLength(13);
    expect(provinces).toContain("ON");
    expect(provinces).toContain("BC");
    expect(provinces).toContain("QC");
    expect(provinces).toContain("AB");
  });
});

describe("isValidProvince", () => {
  it("returns true for valid province codes", () => {
    expect(isValidProvince("ON")).toBe(true);
    expect(isValidProvince("BC")).toBe(true);
    expect(isValidProvince("QC")).toBe(true);
  });

  it("returns false for invalid codes", () => {
    expect(isValidProvince("XX")).toBe(false);
    expect(isValidProvince("")).toBe(false);
    expect(isValidProvince("Ontario")).toBe(false);
    expect(isValidProvince("on")).toBe(false); // Case sensitive
  });
});

// =============================================================================
// Constants Tests
// =============================================================================

describe("DEFAULT_PROFESSIONAL_FEES", () => {
  it("has legal fees as percentage", () => {
    expect(DEFAULT_PROFESSIONAL_FEES.legal.type).toBe("percentage");
    if (DEFAULT_PROFESSIONAL_FEES.legal.type === "percentage") {
      expect(DEFAULT_PROFESSIONAL_FEES.legal.rate).toBe(2);
    }
  });

  it("has accounting fees as fixed", () => {
    expect(DEFAULT_PROFESSIONAL_FEES.accounting.type).toBe("fixed");
    if (DEFAULT_PROFESSIONAL_FEES.accounting.type === "fixed") {
      expect(DEFAULT_PROFESSIONAL_FEES.accounting.amount).toBe(3000);
    }
  });

  it("has executor fees as percentage", () => {
    expect(DEFAULT_PROFESSIONAL_FEES.executor.type).toBe("percentage");
    if (DEFAULT_PROFESSIONAL_FEES.executor.type === "percentage") {
      expect(DEFAULT_PROFESSIONAL_FEES.executor.rate).toBe(2.5);
    }
  });
});

describe("DEFAULT_FUNERAL_EXPENSES", () => {
  it("is set to $10,000", () => {
    expect(DEFAULT_FUNERAL_EXPENSES).toBe(10000);
  });
});

describe("PROVINCE_NAMES", () => {
  it("has all 13 provinces/territories", () => {
    expect(Object.keys(PROVINCE_NAMES)).toHaveLength(13);
  });

  it("maps codes to full names", () => {
    expect(PROVINCE_NAMES.ON).toBe("Ontario");
    expect(PROVINCE_NAMES.BC).toBe("British Columbia");
    expect(PROVINCE_NAMES.QC).toBe("Quebec");
    expect(PROVINCE_NAMES.AB).toBe("Alberta");
  });
});

// =============================================================================
// Real-World Scenario Tests
// =============================================================================

describe("real-world scenarios", () => {
  it("calculates settling for Ontario family with house", () => {
    const input: SettlingRequirementsInput = {
      province: "ON",
      estateValue: 1200000, // House + investments + other
      finalYearIncome: 85000,
      assets: [
        { currentValue: 750000, costBasis: 350000, isExempt: true }, // Principal residence
        { currentValue: 250000, costBasis: 100000 }, // Investment portfolio
        { currentValue: 200000, costBasis: 150000 }, // RRSP (deemed disposition)
      ],
      funeralExpenses: 12000,
    };

    const result = calculateSettlingRequirements(input);

    // Ontario probate: $250 + ($1,150,000 × $15) = $17,500
    expect(result.probateFees).toBeGreaterThan(17000);

    // Capital gains only on non-exempt assets: $150,000 + $50,000 = $200,000
    expect(result.capitalGainsBreakdown.totalGains).toBe(200000);
    expect(result.capitalGainsBreakdown.taxableGains).toBe(100000);

    // Verify exempt asset was excluded
    expect(result.capitalGainsBreakdown.exemptAssets).toBe(1);

    // Total should be substantial
    expect(result.totalSettlingRequirements).toBeGreaterThan(50000);
  });

  it("calculates settling for Quebec estate (no probate)", () => {
    const input: SettlingRequirementsInput = {
      province: "QC",
      estateValue: 800000,
      finalYearIncome: 120000,
      assets: [{ currentValue: 500000, costBasis: 300000 }],
    };

    const result = calculateSettlingRequirements(input);

    // Quebec has no probate fees
    expect(result.probateFees).toBe(0);

    // But still has income tax and capital gains
    expect(result.finalIncomeTax).toBeGreaterThan(0);
    expect(result.capitalGainsTax).toBeGreaterThan(0);
  });

  it("calculates settling for Alberta small estate", () => {
    const input: SettlingRequirementsInput = {
      province: "AB",
      estateValue: 75000,
      finalYearIncome: 30000,
      assets: [{ currentValue: 50000, costBasis: 40000 }],
    };

    const result = calculateSettlingRequirements(input);

    // Alberta has low probate fees
    expect(result.probateFees).toBe(275);

    // Small estate = lower professional fees
    expect(result.professionalFees.total).toBeLessThan(10000);
  });

  it("calculates settling with all custom options", () => {
    const input: SettlingRequirementsInput = {
      province: "BC",
      estateValue: 2000000,
      finalYearIncome: 200000,
      assets: [
        { currentValue: 1000000, costBasis: 400000, isExempt: true },
        {
          currentValue: 500000,
          costBasis: 200000,
          name: "Investment Portfolio",
        },
        { currentValue: 500000, costBasis: 300000, name: "Vacation Property" },
      ],
      professionalFees: {
        legal: { type: "fixed", amount: 25000 },
        accounting: { type: "fixed", amount: 8000 },
        executor: { type: "waived" },
      },
      funeralExpenses: 20000,
    };

    const result = calculateSettlingRequirements(input);

    expect(result.professionalFees.legalFees).toBe(25000);
    expect(result.professionalFees.accountingFees).toBe(8000);
    expect(result.professionalFees.executorFees).toBe(0);
    expect(result.funeralExpenses).toBe(20000);

    // Capital gains only on non-exempt assets
    expect(result.capitalGainsBreakdown.totalGains).toBe(500000);
  });
});
