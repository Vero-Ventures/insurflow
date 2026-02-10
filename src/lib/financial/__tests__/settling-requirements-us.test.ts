import { describe, it, expect } from "vitest";
import {
  calculateUSProbateFees,
  calculateFederalEstateTax,
  calculateStateEstateTax,
  calculateUSFinalIncomeTax,
  calculateUSProfessionalFees,
  calculateUSSettlingRequirements,
  calculateUSSettlingRequirementsRounded,
  isValidUSState,
  FEDERAL_ESTATE_TAX_EXEMPTION_2024,
  FEDERAL_ESTATE_TAX_RATE,
  US_DEFAULT_PROFESSIONAL_FEES,
  US_DEFAULT_FUNERAL_EXPENSES,
  US_STATE_NAMES,
  type USState,
  type USAssetForSettling,
  type USProfessionalFeesConfig,
  type USSettlingRequirementsInput,
} from "../settling-requirements-us";

// =============================================================================
// Probate Fee Tests - Various State Types
// =============================================================================

describe("calculateUSProbateFees", () => {
  describe("California (CA) - Statutory tiered rates", () => {
    it("calculates 4% for first $100,000", () => {
      expect(calculateUSProbateFees(50_000, "CA")).toBe(2_000);
      expect(calculateUSProbateFees(100_000, "CA")).toBe(4_000);
    });

    it("calculates 3% for $100,001 - $200,000", () => {
      // $150,000: $4,000 (first 100k) + $1,500 (50k at 3%) = $5,500
      expect(calculateUSProbateFees(150_000, "CA")).toBe(5_500);
      // $200,000: $4,000 + $3,000 = $7,000
      expect(calculateUSProbateFees(200_000, "CA")).toBe(7_000);
    });

    it("calculates 2% for $200,001 - $1,000,000", () => {
      // $500,000: $4,000 + $3,000 + $6,000 (300k at 2%) = $13,000
      expect(calculateUSProbateFees(500_000, "CA")).toBe(13_000);
      // $1,000,000: $4,000 + $3,000 + $16,000 (800k at 2%) = $23,000
      expect(calculateUSProbateFees(1_000_000, "CA")).toBe(23_000);
    });

    it("calculates 1% for $1,000,001 - $10,000,000", () => {
      // $5,000,000: $23,000 + $40,000 (4M at 1%) = $63,000
      expect(calculateUSProbateFees(5_000_000, "CA")).toBe(63_000);
    });

    it("calculates correctly for large estates", () => {
      // $15,000,000: $23,000 + $90,000 (9M at 1%) + $25,000 (5M at 0.5%) = $138,000
      expect(calculateUSProbateFees(15_000_000, "CA")).toBe(138_000);
    });
  });

  describe("Florida (FL) - Statutory tiered rates", () => {
    it("calculates 3% for first $40,000", () => {
      expect(calculateUSProbateFees(40_000, "FL")).toBe(1_200);
    });

    it("calculates 2.5% for $40,001 - $70,000", () => {
      // $70,000: $1,200 + $750 (30k at 2.5%) = $1,950
      expect(calculateUSProbateFees(70_000, "FL")).toBe(1_950);
    });

    it("calculates correctly for larger estates", () => {
      // $1,000,000: $1,200 + $750 + $600 (30k at 2%) + $13,500 (900k at 1.5%) = $16,050
      expect(calculateUSProbateFees(1_000_000, "FL")).toBe(16_050);
    });

    it("calculates 0.5% for amounts over $3,000,000", () => {
      // $5,000,000: $1,200 + $750 + $600 + $13,500 + $20,000 (2M at 1%) + $10,000 (2M at 0.5%) = $46,050
      expect(calculateUSProbateFees(5_000_000, "FL")).toBe(46_050);
    });
  });

  describe("Connecticut (CT) - Flat fee", () => {
    it("returns flat $500 regardless of estate size", () => {
      expect(calculateUSProbateFees(50_000, "CT")).toBe(500);
      expect(calculateUSProbateFees(500_000, "CT")).toBe(500);
      expect(calculateUSProbateFees(5_000_000, "CT")).toBe(500);
      expect(calculateUSProbateFees(50_000_000, "CT")).toBe(500);
    });
  });

  describe("Maryland (MD) - Flat fee", () => {
    it("returns flat $1,000 regardless of estate size", () => {
      expect(calculateUSProbateFees(100_000, "MD")).toBe(1_000);
      expect(calculateUSProbateFees(1_000_000, "MD")).toBe(1_000);
    });
  });

  describe("New Jersey (NJ) - Flat fee", () => {
    it("returns flat $750 regardless of estate size", () => {
      expect(calculateUSProbateFees(100_000, "NJ")).toBe(750);
      expect(calculateUSProbateFees(10_000_000, "NJ")).toBe(750);
    });
  });

  describe("North Carolina (NC) - Flat fee", () => {
    it("returns flat $400 regardless of estate size", () => {
      expect(calculateUSProbateFees(500_000, "NC")).toBe(400);
    });
  });

  describe("New York (NY) - Statutory tiered rates", () => {
    it("calculates 5% for first $100,000", () => {
      expect(calculateUSProbateFees(100_000, "NY")).toBe(5_000);
    });

    it("calculates 4% for $100,001 - $600,000", () => {
      // $600,000: $5,000 + $20,000 (500k at 4%) = $25,000
      expect(calculateUSProbateFees(600_000, "NY")).toBe(25_000);
    });

    it("calculates 3% for $600,001 - $1,000,000", () => {
      // $1,000,000: $5,000 + $20,000 + $12,000 (400k at 3%) = $37,000
      expect(calculateUSProbateFees(1_000_000, "NY")).toBe(37_000);
    });
  });

  describe("Texas (TX) - 5% statutory rate", () => {
    it("calculates 5% of estate value", () => {
      expect(calculateUSProbateFees(100_000, "TX")).toBe(5_000);
      expect(calculateUSProbateFees(1_000_000, "TX")).toBe(50_000);
    });
  });

  describe("Wyoming (WY) - 10% statutory rate", () => {
    it("calculates 10% of estate value", () => {
      expect(calculateUSProbateFees(100_000, "WY")).toBe(10_000);
      expect(calculateUSProbateFees(500_000, "WY")).toBe(50_000);
    });
  });

  describe("Reasonable fee states", () => {
    it("Ohio (OH) - estimates 4%", () => {
      expect(calculateUSProbateFees(1_000_000, "OH")).toBe(40_000);
    });

    it("Wisconsin (WI) - estimates 2%", () => {
      expect(calculateUSProbateFees(1_000_000, "WI")).toBe(20_000);
    });

    it("Colorado (CO) - estimates 2%", () => {
      expect(calculateUSProbateFees(500_000, "CO")).toBe(10_000);
    });

    it("Alabama (AL) - estimates 3%", () => {
      expect(calculateUSProbateFees(1_000_000, "AL")).toBe(30_000);
    });
  });

  describe("Edge cases", () => {
    it("returns 0 for zero estate value", () => {
      expect(calculateUSProbateFees(0, "CA")).toBe(0);
      expect(calculateUSProbateFees(0, "NY")).toBe(0);
      expect(calculateUSProbateFees(0, "TX")).toBe(0);
    });

    it("returns 0 for negative estate value", () => {
      expect(calculateUSProbateFees(-100_000, "CA")).toBe(0);
    });
  });
});

// =============================================================================
// Federal Estate Tax Tests
// =============================================================================

describe("calculateFederalEstateTax", () => {
  it("uses correct 2024 exemption amount", () => {
    expect(FEDERAL_ESTATE_TAX_EXEMPTION_2024).toBe(13_610_000);
  });

  it("uses correct 40% tax rate", () => {
    expect(FEDERAL_ESTATE_TAX_RATE).toBe(0.4);
  });

  it("returns 0 for estates under exemption", () => {
    expect(calculateFederalEstateTax(1_000_000)).toBe(0);
    expect(calculateFederalEstateTax(5_000_000)).toBe(0);
    expect(calculateFederalEstateTax(10_000_000)).toBe(0);
    expect(calculateFederalEstateTax(13_610_000)).toBe(0);
  });

  it("returns 0 for estates exactly at exemption", () => {
    expect(calculateFederalEstateTax(FEDERAL_ESTATE_TAX_EXEMPTION_2024)).toBe(
      0,
    );
  });

  it("calculates 40% tax on amount over exemption", () => {
    // $14,610,000: $1M over exemption = $400,000 tax
    expect(calculateFederalEstateTax(14_610_000)).toBe(400_000);

    // $15,610,000: $2M over exemption = $800,000 tax
    expect(calculateFederalEstateTax(15_610_000)).toBe(800_000);

    // $20,000,000: $6,390,000 over = $2,556,000 tax
    expect(calculateFederalEstateTax(20_000_000)).toBe(2_556_000);
  });

  it("allows custom exemption amount", () => {
    // Custom exemption of $5M
    expect(calculateFederalEstateTax(6_000_000, 5_000_000)).toBe(400_000);
    expect(calculateFederalEstateTax(4_000_000, 5_000_000)).toBe(0);
  });

  it("handles very large estates", () => {
    // $100M estate: $86,390,000 over exemption = $34,556,000 tax
    expect(calculateFederalEstateTax(100_000_000)).toBe(34_556_000);
  });

  it("returns 0 for zero estate value", () => {
    expect(calculateFederalEstateTax(0)).toBe(0);
  });

  it("returns 0 for negative estate value", () => {
    expect(calculateFederalEstateTax(-1_000_000)).toBe(0);
  });
});

// =============================================================================
// State Estate/Inheritance Tax Tests
// =============================================================================

describe("calculateStateEstateTax", () => {
  describe("States with no estate/inheritance tax", () => {
    const noTaxStates: USState[] = [
      "AL",
      "AK",
      "AZ",
      "AR",
      "CA",
      "CO",
      "DE",
      "FL",
      "GA",
      "ID",
      "IN",
      "KS",
      "LA",
      "MI",
      "MS",
      "MO",
      "MT",
      "NV",
      "NH",
      "NM",
      "NC",
      "ND",
      "OH",
      "OK",
      "SC",
      "SD",
      "TN",
      "TX",
      "UT",
      "VA",
      "WV",
      "WI",
      "WY",
    ];

    it.each(noTaxStates)("%s returns 0 tax", (state) => {
      const result = calculateStateEstateTax(10_000_000, state);
      expect(result.tax).toBe(0);
      expect(result.type).toBe("none");
    });
  });

  describe("Massachusetts (MA) - $2M exemption, 16% top rate", () => {
    it("returns 0 for estates under $2M", () => {
      const result = calculateStateEstateTax(1_500_000, "MA");
      expect(result.tax).toBe(0);
      expect(result.type).toBe("estate");
    });

    it("calculates tax on amount over $2M", () => {
      // $5M estate: $3M taxable at 16% = $480,000
      const result = calculateStateEstateTax(5_000_000, "MA");
      expect(result.tax).toBe(480_000);
      expect(result.type).toBe("estate");
    });
  });

  describe("New York (NY) - $6.94M exemption, 16% top rate", () => {
    it("returns 0 for estates under exemption", () => {
      const result = calculateStateEstateTax(5_000_000, "NY");
      expect(result.tax).toBe(0);
    });

    it("calculates tax on amount over exemption", () => {
      // $10M estate: $3.06M taxable at 16% = $489,600
      const result = calculateStateEstateTax(10_000_000, "NY");
      expect(result.tax).toBe(489_600);
    });
  });

  describe("Oregon (OR) - $1M exemption (lowest)", () => {
    it("returns 0 for estates under $1M", () => {
      const result = calculateStateEstateTax(800_000, "OR");
      expect(result.tax).toBe(0);
    });

    it("calculates tax on amount over $1M", () => {
      // $3M estate: $2M taxable at 16% = $320,000
      const result = calculateStateEstateTax(3_000_000, "OR");
      expect(result.tax).toBe(320_000);
    });
  });

  describe("Washington (WA) - $2.193M exemption, 20% top rate", () => {
    it("applies highest state rate (20%)", () => {
      // $5M estate: $2.807M taxable at 20% = $561,400
      const result = calculateStateEstateTax(5_000_000, "WA");
      expect(result.tax).toBe(561_400);
      expect(result.type).toBe("estate");
    });
  });

  describe("Hawaii (HI) - $5.49M exemption, 20% top rate", () => {
    it("returns 0 for estates under exemption", () => {
      const result = calculateStateEstateTax(5_000_000, "HI");
      expect(result.tax).toBe(0);
    });

    it("calculates tax for estates over exemption", () => {
      // $10M estate: $4.51M taxable at 20% = $902,000
      const result = calculateStateEstateTax(10_000_000, "HI");
      expect(result.tax).toBe(902_000);
    });
  });

  describe("Connecticut (CT) - Matches federal exemption", () => {
    it("returns 0 for estates under $13.61M", () => {
      const result = calculateStateEstateTax(10_000_000, "CT");
      expect(result.tax).toBe(0);
    });

    it("calculates tax for estates over exemption", () => {
      // $15M estate: $1.39M taxable at 12% = $166,800
      const result = calculateStateEstateTax(15_000_000, "CT");
      expect(result.tax).toBe(166_800);
    });
  });

  describe("DC - $4.5M exemption, 16% top rate", () => {
    it("calculates correctly for DC estates", () => {
      // $6M estate: $1.4712M taxable at 16% = $235,392 (approx)
      const result = calculateStateEstateTax(6_000_000, "DC");
      expect(result.tax).toBe(235_392);
      expect(result.type).toBe("estate");
    });
  });

  describe("Inheritance tax states", () => {
    it("Pennsylvania (PA) - inheritance tax estimated", () => {
      const result = calculateStateEstateTax(1_000_000, "PA");
      // 15% top rate * 50% estimate = 7.5% of estate
      expect(result.tax).toBe(75_000);
      expect(result.type).toBe("inheritance");
      expect(result.notes).toContain(
        "Pennsylvania has an inheritance tax (paid by beneficiaries)",
      );
    });

    it("New Jersey (NJ) - inheritance tax estimated", () => {
      const result = calculateStateEstateTax(2_000_000, "NJ");
      // 16% top rate * 50% estimate = 8% of estate
      expect(result.tax).toBe(160_000);
      expect(result.type).toBe("inheritance");
    });

    it("Kentucky (KY) - inheritance tax estimated", () => {
      const result = calculateStateEstateTax(1_000_000, "KY");
      // 16% top rate * 50% estimate = 8% of estate
      expect(result.tax).toBe(80_000);
      expect(result.type).toBe("inheritance");
    });

    it("Iowa (IA) - inheritance tax estimated", () => {
      const result = calculateStateEstateTax(500_000, "IA");
      // 6% top rate * 50% estimate = 3% of estate
      expect(result.tax).toBe(15_000);
      expect(result.type).toBe("inheritance");
    });

    it("Nebraska (NE) - inheritance tax estimated", () => {
      const result = calculateStateEstateTax(1_000_000, "NE");
      // 18% top rate * 50% estimate = 9% of estate
      expect(result.tax).toBe(90_000);
      expect(result.type).toBe("inheritance");
    });
  });

  describe("Maryland (MD) - has both estate AND inheritance tax", () => {
    it("identifies as 'both' type", () => {
      const result = calculateStateEstateTax(6_000_000, "MD");
      expect(result.type).toBe("both");
    });

    it("calculates estate tax on amount over $5M", () => {
      // $6M estate: $1M taxable at 16% = $160,000
      const result = calculateStateEstateTax(6_000_000, "MD");
      expect(result.tax).toBe(160_000);
    });
  });
});

// =============================================================================
// Final Income Tax Tests
// =============================================================================

describe("calculateUSFinalIncomeTax", () => {
  it("returns 0 for zero income", () => {
    expect(calculateUSFinalIncomeTax(0)).toBe(0);
  });

  it("returns 0 for negative income", () => {
    expect(calculateUSFinalIncomeTax(-50_000)).toBe(0);
  });

  it("calculates correctly for income in 10% bracket", () => {
    // $10,000: 10% federal + 5% state = $1,500
    expect(calculateUSFinalIncomeTax(10_000)).toBe(1_500);
  });

  it("calculates correctly for income in 22% bracket", () => {
    // $75,000 income
    // Federal: $1,160 (first 11.6k) + $4,266 (next 35.55k at 12%) + $6,127 (next 27.85k at 22%) = $11,553
    // State: $75,000 * 5% = $3,750
    // Total: ~$15,303
    const tax = calculateUSFinalIncomeTax(75_000);
    expect(tax).toBeGreaterThan(15_000);
    expect(tax).toBeLessThan(16_000);
  });

  it("calculates correctly for income in 32% bracket", () => {
    // $200,000 income
    const tax = calculateUSFinalIncomeTax(200_000);
    // Should be around $50k-$55k total (federal + state)
    expect(tax).toBeGreaterThan(48_000);
    expect(tax).toBeLessThan(56_000);
  });

  it("calculates correctly for high income in 37% bracket", () => {
    // $1,000,000 income
    const tax = calculateUSFinalIncomeTax(1_000_000);
    // Should be around $370k-$390k total (federal ~$328k + state 5% ~$50k)
    expect(tax).toBeGreaterThan(370_000);
    expect(tax).toBeLessThan(390_000);
  });
});

// =============================================================================
// Professional Fees Tests
// =============================================================================

describe("calculateUSProfessionalFees", () => {
  it("uses default configuration when none provided", () => {
    const result = calculateUSProfessionalFees(1_000_000);

    // Legal: 3% of $1M = $30,000
    expect(result.legalFees).toBe(30_000);
    // Accounting: fixed $3,500
    expect(result.accountingFees).toBe(3_500);
    // Executor: 2% of $1M = $20,000
    expect(result.executorFees).toBe(20_000);
    // Total
    expect(result.total).toBe(53_500);
  });

  it("respects custom fixed legal fees", () => {
    const config: USProfessionalFeesConfig = {
      ...US_DEFAULT_PROFESSIONAL_FEES,
      legal: { type: "fixed", amount: 15_000 },
    };
    const result = calculateUSProfessionalFees(1_000_000, config);
    expect(result.legalFees).toBe(15_000);
  });

  it("respects custom percentage accounting fees", () => {
    const config: USProfessionalFeesConfig = {
      ...US_DEFAULT_PROFESSIONAL_FEES,
      accounting: { type: "percentage", rate: 1 },
    };
    const result = calculateUSProfessionalFees(500_000, config);
    expect(result.accountingFees).toBe(5_000);
  });

  it("returns 0 executor fees when waived", () => {
    const config: USProfessionalFeesConfig = {
      ...US_DEFAULT_PROFESSIONAL_FEES,
      executor: { type: "waived" },
    };
    const result = calculateUSProfessionalFees(1_000_000, config);
    expect(result.executorFees).toBe(0);
  });

  it("handles zero estate value", () => {
    const result = calculateUSProfessionalFees(0);
    expect(result.legalFees).toBe(0);
    expect(result.accountingFees).toBe(3_500); // Fixed amount still applies
    expect(result.executorFees).toBe(0);
  });

  it("handles negative estate value", () => {
    const result = calculateUSProfessionalFees(-100_000);
    expect(result.legalFees).toBe(0);
    expect(result.executorFees).toBe(0);
  });

  it("calculates total correctly", () => {
    const result = calculateUSProfessionalFees(2_000_000);
    expect(result.total).toBe(
      result.legalFees + result.accountingFees + result.executorFees,
    );
  });
});

// =============================================================================
// Main Calculation Function Tests
// =============================================================================

describe("calculateUSSettlingRequirements", () => {
  const createBasicInput = (
    overrides: Partial<USSettlingRequirementsInput> = {},
  ): USSettlingRequirementsInput => ({
    state: "CA",
    estateValue: 1_000_000,
    finalYearIncome: 75_000,
    assets: [
      { currentValue: 500_000, costBasis: 300_000, type: "real_estate" },
      { currentValue: 500_000, costBasis: 200_000, type: "investments" },
    ],
    ...overrides,
  });

  describe("Basic calculation", () => {
    it("calculates all components correctly", () => {
      const input = createBasicInput();
      const result = calculateUSSettlingRequirements(input);

      // Probate fees for CA at $1M = $23,000
      expect(result.probateFees).toBe(23_000);

      // Federal estate tax = 0 (under exemption)
      expect(result.federalEstateTax).toBe(0);

      // State estate tax for CA = 0 (CA has no estate tax)
      expect(result.stateEstateTax).toBe(0);

      // Professional fees at $1M
      expect(result.professionalFees.total).toBe(53_500);

      // Funeral expenses default
      expect(result.funeralExpenses).toBe(US_DEFAULT_FUNERAL_EXPENSES);
    });

    it("includes correct input summary", () => {
      const input = createBasicInput();
      const result = calculateUSSettlingRequirements(input);

      expect(result.inputsUsed.state).toBe("CA");
      expect(result.inputsUsed.stateName).toBe("California");
      expect(result.inputsUsed.estateValue).toBe(1_000_000);
      expect(result.inputsUsed.finalYearIncome).toBe(75_000);
      expect(result.inputsUsed.assetCount).toBe(2);
    });

    it("calculates total correctly", () => {
      const input = createBasicInput();
      const result = calculateUSSettlingRequirements(input);

      const expectedTotal =
        result.probateFees +
        result.federalEstateTax +
        result.stateEstateTax +
        result.finalIncomeTax +
        result.professionalFees.total +
        result.funeralExpenses;

      expect(result.totalSettlingRequirements).toBe(expectedTotal);
    });
  });

  describe("Large estate with federal estate tax", () => {
    it("calculates federal estate tax for estates over $13.61M", () => {
      const input = createBasicInput({
        estateValue: 20_000_000,
      });
      const result = calculateUSSettlingRequirements(input);

      // $20M - $13.61M = $6.39M taxable at 40% = $2,556,000
      expect(result.federalEstateTax).toBe(2_556_000);
    });
  });

  describe("State with estate tax", () => {
    it("calculates Massachusetts estate tax for estates over $2M", () => {
      const input = createBasicInput({
        state: "MA",
        estateValue: 5_000_000,
      });
      const result = calculateUSSettlingRequirements(input);

      // $5M - $2M = $3M taxable at 16% = $480,000
      expect(result.stateEstateTax).toBe(480_000);
    });

    it("calculates Oregon estate tax for estates over $1M", () => {
      const input = createBasicInput({
        state: "OR",
        estateValue: 3_000_000,
      });
      const result = calculateUSSettlingRequirements(input);

      // $3M - $1M = $2M taxable at 16% = $320,000
      expect(result.stateEstateTax).toBe(320_000);
    });
  });

  describe("State with inheritance tax", () => {
    it("estimates Pennsylvania inheritance tax", () => {
      const input = createBasicInput({
        state: "PA",
        estateValue: 2_000_000,
      });
      const result = calculateUSSettlingRequirements(input);

      // 15% * 50% estimate = 7.5% = $150,000
      expect(result.stateEstateTax).toBe(150_000);
    });
  });

  describe("Custom funeral expenses", () => {
    it("uses custom funeral expenses when provided", () => {
      const input = createBasicInput({
        funeralExpenses: 25_000,
      });
      const result = calculateUSSettlingRequirements(input);

      expect(result.funeralExpenses).toBe(25_000);
    });
  });

  describe("Custom professional fees", () => {
    it("uses custom professional fees configuration", () => {
      const input = createBasicInput({
        professionalFees: {
          legal: { type: "fixed", amount: 10_000 },
          executor: { type: "waived" },
        },
      });
      const result = calculateUSSettlingRequirements(input);

      expect(result.professionalFees.legalFees).toBe(10_000);
      expect(result.professionalFees.executorFees).toBe(0);
    });
  });

  describe("Notes generation", () => {
    it("includes note about step-up in basis", () => {
      const input = createBasicInput();
      const result = calculateUSSettlingRequirements(input);

      expect(result.notes).toContain(
        "Assets receive step-up in basis at death, typically eliminating capital gains",
      );
    });

    it("includes note when below federal exemption", () => {
      const input = createBasicInput();
      const result = calculateUSSettlingRequirements(input);

      expect(result.notes).toContain(
        `Estate below federal exemption of $${FEDERAL_ESTATE_TAX_EXEMPTION_2024.toLocaleString()}`,
      );
    });

    it("includes state-specific notes", () => {
      const input = createBasicInput({
        state: "MA",
        estateValue: 5_000_000,
      });
      const result = calculateUSSettlingRequirements(input);

      expect(
        result.notes.some((note) => note.includes("Massachusetts estate tax")),
      ).toBe(true);
    });
  });

  describe("Different states comparison", () => {
    it("shows significant cost difference between states", () => {
      const baseInput = {
        estateValue: 3_000_000,
        finalYearIncome: 100_000,
        assets: [{ currentValue: 3_000_000, costBasis: 1_500_000 }],
      };

      // Texas - no state estate tax, 5% probate
      const texasResult = calculateUSSettlingRequirements({
        ...baseInput,
        state: "TX",
      });

      // Oregon - $1M exemption, 16% estate tax
      const oregonResult = calculateUSSettlingRequirements({
        ...baseInput,
        state: "OR",
      });

      // Oregon should have significantly higher costs due to estate tax
      expect(oregonResult.totalSettlingRequirements).toBeGreaterThan(
        texasResult.totalSettlingRequirements,
      );

      // Oregon estate tax should be $320,000
      expect(oregonResult.stateEstateTax).toBe(320_000);
      expect(texasResult.stateEstateTax).toBe(0);
    });
  });
});

// =============================================================================
// Rounded Calculation Tests
// =============================================================================

describe("calculateUSSettlingRequirementsRounded", () => {
  it("returns rounded values", () => {
    const input: USSettlingRequirementsInput = {
      state: "CA",
      estateValue: 1_234_567,
      finalYearIncome: 87_654,
      assets: [{ currentValue: 1_234_567, costBasis: 500_000 }],
    };

    const result = calculateUSSettlingRequirementsRounded(input);

    // All numeric values should be integers
    expect(Number.isInteger(result.probateFees)).toBe(true);
    expect(Number.isInteger(result.federalEstateTax)).toBe(true);
    expect(Number.isInteger(result.stateEstateTax)).toBe(true);
    expect(Number.isInteger(result.finalIncomeTax)).toBe(true);
    expect(Number.isInteger(result.professionalFees.legalFees)).toBe(true);
    expect(Number.isInteger(result.professionalFees.accountingFees)).toBe(true);
    expect(Number.isInteger(result.professionalFees.executorFees)).toBe(true);
    expect(Number.isInteger(result.professionalFees.total)).toBe(true);
    expect(Number.isInteger(result.funeralExpenses)).toBe(true);
    expect(Number.isInteger(result.totalSettlingRequirements)).toBe(true);
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe("isValidUSState", () => {
  it("returns true for valid state codes", () => {
    expect(isValidUSState("CA")).toBe(true);
    expect(isValidUSState("NY")).toBe(true);
    expect(isValidUSState("TX")).toBe(true);
    expect(isValidUSState("DC")).toBe(true);
  });

  it("returns false for invalid state codes", () => {
    expect(isValidUSState("XX")).toBe(false);
    expect(isValidUSState("")).toBe(false);
    expect(isValidUSState("California")).toBe(false);
    expect(isValidUSState("ca")).toBe(false); // Case sensitive
  });

  it("returns false for Canadian provinces", () => {
    expect(isValidUSState("ON")).toBe(false);
    expect(isValidUSState("BC")).toBe(false);
    expect(isValidUSState("QC")).toBe(false);
  });
});

describe("US_STATE_NAMES", () => {
  it("contains all 50 states plus DC", () => {
    expect(Object.keys(US_STATE_NAMES).length).toBe(51);
  });

  it("has correct state names", () => {
    expect(US_STATE_NAMES.CA).toBe("California");
    expect(US_STATE_NAMES.NY).toBe("New York");
    expect(US_STATE_NAMES.DC).toBe("District of Columbia");
    expect(US_STATE_NAMES.TX).toBe("Texas");
  });
});

describe("Default values", () => {
  it("has reasonable default professional fees", () => {
    expect(US_DEFAULT_PROFESSIONAL_FEES.legal).toEqual({
      type: "percentage",
      rate: 3,
    });
    expect(US_DEFAULT_PROFESSIONAL_FEES.accounting).toEqual({
      type: "fixed",
      amount: 3500,
    });
    expect(US_DEFAULT_PROFESSIONAL_FEES.executor).toEqual({
      type: "percentage",
      rate: 2,
    });
  });

  it("has reasonable default funeral expenses", () => {
    expect(US_DEFAULT_FUNERAL_EXPENSES).toBe(12_000);
  });
});

// =============================================================================
// Integration Tests - Real-World Scenarios
// =============================================================================

describe("Real-world scenarios", () => {
  it("middle-class estate in California", () => {
    const input: USSettlingRequirementsInput = {
      state: "CA",
      estateValue: 750_000,
      finalYearIncome: 65_000,
      assets: [
        { currentValue: 450_000, costBasis: 200_000, type: "real_estate" },
        { currentValue: 150_000, costBasis: 100_000, type: "retirement" },
        { currentValue: 100_000, costBasis: 80_000, type: "investments" },
        { currentValue: 50_000, costBasis: 50_000, type: "cash" },
      ],
    };

    const result = calculateUSSettlingRequirements(input);

    // No federal or state estate tax
    expect(result.federalEstateTax).toBe(0);
    expect(result.stateEstateTax).toBe(0);

    // CA probate fees for $750k
    // $4,000 (first 100k) + $3,000 (next 100k) + $11,000 (550k at 2%) = $18,000
    expect(result.probateFees).toBe(18_000);

    // Total should be manageable
    expect(result.totalSettlingRequirements).toBeLessThan(100_000);
  });

  it("wealthy estate in Massachusetts", () => {
    const input: USSettlingRequirementsInput = {
      state: "MA",
      estateValue: 8_000_000,
      finalYearIncome: 350_000,
      assets: [
        { currentValue: 3_000_000, costBasis: 500_000, type: "real_estate" },
        { currentValue: 3_000_000, costBasis: 1_500_000, type: "investments" },
        { currentValue: 2_000_000, costBasis: 2_000_000, type: "business" },
      ],
    };

    const result = calculateUSSettlingRequirements(input);

    // No federal estate tax (under $13.61M)
    expect(result.federalEstateTax).toBe(0);

    // MA estate tax: $8M - $2M = $6M at 16% = $960,000
    expect(result.stateEstateTax).toBe(960_000);

    // MA uses "reasonable" probate fees at 3%
    expect(result.probateFees).toBe(240_000);

    // Total should be over $1M due to MA estate tax
    expect(result.totalSettlingRequirements).toBeGreaterThan(1_000_000);
  });

  it("ultra-high-net-worth estate in Washington", () => {
    const input: USSettlingRequirementsInput = {
      state: "WA",
      estateValue: 25_000_000,
      finalYearIncome: 1_000_000,
      assets: [
        { currentValue: 10_000_000, costBasis: 2_000_000, type: "real_estate" },
        { currentValue: 10_000_000, costBasis: 5_000_000, type: "business" },
        { currentValue: 5_000_000, costBasis: 3_000_000, type: "investments" },
      ],
    };

    const result = calculateUSSettlingRequirements(input);

    // Federal estate tax: $25M - $13.61M = $11.39M at 40% = $4,556,000
    expect(result.federalEstateTax).toBe(4_556_000);

    // WA estate tax: $25M - $2.193M = $22.807M at 20% = $4,561,400
    expect(result.stateEstateTax).toBe(4_561_400);

    // Total should be very high (both taxes apply)
    expect(result.totalSettlingRequirements).toBeGreaterThan(9_000_000);
  });

  it("modest estate in Texas (no state taxes, flat probate)", () => {
    const input: USSettlingRequirementsInput = {
      state: "TX",
      estateValue: 500_000,
      finalYearIncome: 50_000,
      assets: [
        { currentValue: 350_000, costBasis: 150_000, type: "real_estate" },
        { currentValue: 100_000, costBasis: 80_000, type: "retirement" },
        { currentValue: 50_000, costBasis: 50_000, type: "cash" },
      ],
    };

    const result = calculateUSSettlingRequirements(input);

    // No federal or state estate tax
    expect(result.federalEstateTax).toBe(0);
    expect(result.stateEstateTax).toBe(0);

    // TX probate at 5% = $25,000
    expect(result.probateFees).toBe(25_000);

    // Total should be modest
    expect(result.totalSettlingRequirements).toBeLessThan(75_000);
  });

  it("estate in Pennsylvania with inheritance tax", () => {
    const input: USSettlingRequirementsInput = {
      state: "PA",
      estateValue: 2_000_000,
      finalYearIncome: 120_000,
      assets: [
        { currentValue: 1_200_000, costBasis: 400_000, type: "real_estate" },
        { currentValue: 800_000, costBasis: 500_000, type: "investments" },
      ],
    };

    const result = calculateUSSettlingRequirements(input);

    // No federal estate tax
    expect(result.federalEstateTax).toBe(0);

    // PA inheritance tax estimate: 15% * 50% = 7.5% = $150,000
    expect(result.stateEstateTax).toBe(150_000);

    // Notes should mention inheritance tax
    expect(result.notes.some((note) => note.includes("inheritance tax"))).toBe(
      true,
    );
  });
});
