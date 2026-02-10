/**
 * Settling Requirements Calculation Engine
 *
 * Implements the settling requirements logic as specified in PRD §7.1.
 * Calculates the costs associated with settling an estate in Canada:
 * - Province-specific probate fees
 * - Final income taxes
 * - Capital gains tax on deemed disposition
 * - Professional fees (legal, accounting, executor)
 *
 * All functions are pure and side-effect free for easy testing.
 * This module is standalone and does not depend on other calculation engines.
 */

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Canadian provinces and territories
 */
export type CanadianProvince =
  | "AB" // Alberta
  | "BC" // British Columbia
  | "MB" // Manitoba
  | "NB" // New Brunswick
  | "NL" // Newfoundland and Labrador
  | "NS" // Nova Scotia
  | "NT" // Northwest Territories
  | "NU" // Nunavut
  | "ON" // Ontario
  | "PE" // Prince Edward Island
  | "QC" // Quebec
  | "SK" // Saskatchewan
  | "YT"; // Yukon

/**
 * Asset with cost basis for capital gains calculation
 */
export interface AssetForSettling {
  /** Current fair market value */
  currentValue: number;
  /** Original cost basis (purchase price + improvements) */
  costBasis: number;
  /** Whether this asset is exempt from deemed disposition (e.g., principal residence) */
  isExempt?: boolean;
  /** Asset type for categorization */
  type?: string;
  /** Asset name for reporting */
  name?: string;
}

/**
 * Professional fees configuration
 */
export interface ProfessionalFeesConfig {
  /** Legal fees - fixed amount or percentage of estate */
  legal:
    | { type: "fixed"; amount: number }
    | { type: "percentage"; rate: number };
  /** Accounting fees - fixed amount or percentage of estate */
  accounting:
    | { type: "fixed"; amount: number }
    | { type: "percentage"; rate: number };
  /** Executor compensation - percentage of estate value */
  executor: { type: "percentage"; rate: number } | { type: "waived" };
}

/**
 * Input parameters for settling requirements calculation
 */
export interface SettlingRequirementsInput {
  /** Province/territory of residence at death */
  province: CanadianProvince;
  /** Total estate value for probate calculation */
  estateValue: number;
  /** Client's final year income (for income tax calculation) */
  finalYearIncome: number;
  /** Assets subject to deemed disposition */
  assets: AssetForSettling[];
  /** Professional fees configuration (optional - uses defaults if not provided) */
  professionalFees?: Partial<ProfessionalFeesConfig>;
  /** Funeral and burial expenses estimate */
  funeralExpenses?: number;
}

/**
 * Breakdown of capital gains calculation
 */
export interface CapitalGainsBreakdown {
  /** Total unrealized gains across all non-exempt assets */
  totalGains: number;
  /** Taxable portion (50% of gains in Canada) */
  taxableGains: number;
  /** Estimated tax on capital gains */
  capitalGainsTax: number;
  /** Number of assets with gains */
  assetsWithGains: number;
  /** Number of exempt assets */
  exemptAssets: number;
}

/**
 * Breakdown of professional fees
 */
export interface ProfessionalFeesBreakdown {
  /** Legal fees (probate application, estate administration) */
  legalFees: number;
  /** Accounting fees (final tax returns, estate accounting) */
  accountingFees: number;
  /** Executor compensation */
  executorFees: number;
  /** Total professional fees */
  total: number;
}

/**
 * Result of settling requirements calculation with component breakdown
 */
export interface SettlingRequirementsResult {
  /** Province-specific probate fees */
  probateFees: number;
  /** Final income tax estimate */
  finalIncomeTax: number;
  /** Capital gains tax on deemed disposition */
  capitalGainsTax: number;
  /** Detailed capital gains breakdown */
  capitalGainsBreakdown: CapitalGainsBreakdown;
  /** Professional fees breakdown */
  professionalFees: ProfessionalFeesBreakdown;
  /** Funeral and burial expenses */
  funeralExpenses: number;
  /** Total settling requirements */
  totalSettlingRequirements: number;
  /** Input parameters used for calculation (for audit trail) */
  inputsUsed: {
    province: CanadianProvince;
    estateValue: number;
    finalYearIncome: number;
    assetCount: number;
    totalAssetValue: number;
    totalCostBasis: number;
  };
}

// =============================================================================
// Constants & Rate Tables
// =============================================================================

/**
 * Default professional fees configuration
 * Based on typical Canadian estate administration costs
 */
export const DEFAULT_PROFESSIONAL_FEES: ProfessionalFeesConfig = {
  legal: { type: "percentage", rate: 2 }, // 2% of estate, typical range 1-3%
  accounting: { type: "fixed", amount: 3000 }, // $3,000 for final returns
  executor: { type: "percentage", rate: 2.5 }, // 2.5% is common guideline
};

/**
 * Default funeral expenses estimate
 * Based on average Canadian funeral costs
 */
export const DEFAULT_FUNERAL_EXPENSES = 10000;

/**
 * Province display names for reporting
 */
export const PROVINCE_NAMES: Record<CanadianProvince, string> = {
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NS: "Nova Scotia",
  NT: "Northwest Territories",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon",
};

/**
 * 2024 Federal tax brackets (Canada)
 */
const FEDERAL_TAX_BRACKETS_2024 = [
  { threshold: 0, rate: 0.15 },
  { threshold: 55867, rate: 0.205 },
  { threshold: 111733, rate: 0.26 },
  { threshold: 173205, rate: 0.29 },
  { threshold: 246752, rate: 0.33 },
];

/**
 * 2024 Provincial tax brackets
 * Simplified to top marginal rates for estimation purposes
 */
const PROVINCIAL_TAX_BRACKETS_2024: Record<
  CanadianProvince,
  { threshold: number; rate: number }[]
> = {
  AB: [
    { threshold: 0, rate: 0.1 },
    { threshold: 148269, rate: 0.12 },
    { threshold: 177922, rate: 0.13 },
    { threshold: 237230, rate: 0.14 },
    { threshold: 355845, rate: 0.15 },
  ],
  BC: [
    { threshold: 0, rate: 0.0506 },
    { threshold: 47937, rate: 0.077 },
    { threshold: 95875, rate: 0.105 },
    { threshold: 110076, rate: 0.1229 },
    { threshold: 133664, rate: 0.147 },
    { threshold: 181232, rate: 0.168 },
    { threshold: 252752, rate: 0.205 },
  ],
  MB: [
    { threshold: 0, rate: 0.108 },
    { threshold: 47000, rate: 0.1275 },
    { threshold: 100000, rate: 0.174 },
  ],
  NB: [
    { threshold: 0, rate: 0.094 },
    { threshold: 49958, rate: 0.14 },
    { threshold: 99916, rate: 0.16 },
    { threshold: 185064, rate: 0.195 },
  ],
  NL: [
    { threshold: 0, rate: 0.087 },
    { threshold: 43198, rate: 0.145 },
    { threshold: 86395, rate: 0.158 },
    { threshold: 154244, rate: 0.178 },
    { threshold: 215943, rate: 0.198 },
    { threshold: 275870, rate: 0.208 },
    { threshold: 551739, rate: 0.213 },
    { threshold: 1103478, rate: 0.218 },
  ],
  NS: [
    { threshold: 0, rate: 0.0879 },
    { threshold: 29590, rate: 0.1495 },
    { threshold: 59180, rate: 0.1667 },
    { threshold: 93000, rate: 0.175 },
    { threshold: 150000, rate: 0.21 },
  ],
  NT: [
    { threshold: 0, rate: 0.059 },
    { threshold: 50597, rate: 0.086 },
    { threshold: 101198, rate: 0.122 },
    { threshold: 164525, rate: 0.1405 },
  ],
  NU: [
    { threshold: 0, rate: 0.04 },
    { threshold: 53268, rate: 0.07 },
    { threshold: 106537, rate: 0.09 },
    { threshold: 173205, rate: 0.115 },
  ],
  ON: [
    { threshold: 0, rate: 0.0505 },
    { threshold: 51446, rate: 0.0915 },
    { threshold: 102894, rate: 0.1116 },
    { threshold: 150000, rate: 0.1216 },
    { threshold: 220000, rate: 0.1316 },
  ],
  PE: [
    { threshold: 0, rate: 0.098 },
    { threshold: 32656, rate: 0.138 },
    { threshold: 64313, rate: 0.167 },
    { threshold: 105000, rate: 0.1837 },
    { threshold: 140000, rate: 0.1865 },
  ],
  QC: [
    { threshold: 0, rate: 0.14 },
    { threshold: 51780, rate: 0.19 },
    { threshold: 103545, rate: 0.24 },
    { threshold: 126000, rate: 0.2575 },
  ],
  SK: [
    { threshold: 0, rate: 0.105 },
    { threshold: 52057, rate: 0.125 },
    { threshold: 148734, rate: 0.145 },
  ],
  YT: [
    { threshold: 0, rate: 0.064 },
    { threshold: 55867, rate: 0.09 },
    { threshold: 111733, rate: 0.109 },
    { threshold: 173205, rate: 0.128 },
    { threshold: 500000, rate: 0.15 },
  ],
};

// =============================================================================
// Probate Fee Calculation
// =============================================================================

/**
 * Probate fee structure by province
 * Each province has different fee calculations
 */
interface ProbateFeeStructure {
  calculate: (estateValue: number) => number;
  description: string;
}

/**
 * Province-specific probate fee structures (2024 rates)
 */
const PROBATE_FEE_STRUCTURES: Record<CanadianProvince, ProbateFeeStructure> = {
  // Alberta: Flat fees based on estate value tiers
  AB: {
    calculate: (value) => {
      if (value <= 10000) return 35;
      if (value <= 25000) return 135;
      if (value <= 125000) return 275;
      if (value <= 250000) return 400;
      return 525; // Over $250,000
    },
    description: "Flat fee tiers (lowest in Canada)",
  },

  // British Columbia: $0 up to $25,000, then $6 per $1,000 (or part thereof) over $25,000, plus $208 application fee
  BC: {
    calculate: (value) => {
      if (value <= 25000) return 0;
      const taxableAmount = value - 25000;
      const fee = Math.ceil(taxableAmount / 1000) * 6;
      return fee + 208; // Application fee
    },
    description: "$6 per $1,000 over $25,000 + $208 application fee",
  },

  // Manitoba: $70 up to $10,000, then $7 per $1,000 over $10,000
  MB: {
    calculate: (value) => {
      if (value <= 10000) return 70;
      const over10k = value - 10000;
      return 70 + Math.ceil(over10k / 1000) * 7;
    },
    description: "$70 base + $7 per $1,000 over $10,000",
  },

  // New Brunswick: $5 per $1,000 on first $20,000, then $5 per $500 thereafter
  NB: {
    calculate: (value) => {
      if (value <= 20000) {
        return Math.ceil(value / 1000) * 5;
      }
      const first20k = 100; // $5 × 20
      const remainder = value - 20000;
      return first20k + Math.ceil(remainder / 500) * 5;
    },
    description: "$5 per $1,000 on first $20,000, $5 per $500 thereafter",
  },

  // Newfoundland and Labrador: $60 up to $1,000, then sliding scale
  NL: {
    calculate: (value) => {
      if (value <= 1000) return 60;
      if (value <= 5000) return 60 + (value - 1000) * 0.006;
      if (value <= 10000) return 84 + (value - 5000) * 0.005;
      if (value <= 25000) return 109 + (value - 10000) * 0.004;
      if (value <= 75000) return 169 + (value - 25000) * 0.0035;
      if (value <= 125000) return 344 + (value - 75000) * 0.003;
      if (value <= 250000) return 494 + (value - 125000) * 0.0025;
      if (value <= 500000) return 806.5 + (value - 250000) * 0.002;
      if (value <= 750000) return 1306.5 + (value - 500000) * 0.0015;
      if (value <= 1000000) return 1681.5 + (value - 750000) * 0.001;
      return 1931.5 + (value - 1000000) * 0.0006;
    },
    description: "Progressive rate schedule",
  },

  // Nova Scotia: $89.15 up to $10,000, then $16.82 per $1,000 over $10,000, capped at $1,044.35
  NS: {
    calculate: (value) => {
      if (value <= 10000) return 89.15;
      const over10k = value - 10000;
      const fee = 89.15 + Math.ceil(over10k / 1000) * 16.82;
      return Math.min(fee, 1044.35); // Capped at $1,044.35
    },
    description: "$89.15 base + $16.82 per $1,000, capped at $1,044.35",
  },

  // Northwest Territories: $15 up to $10,000, then sliding scale
  NT: {
    calculate: (value) => {
      if (value <= 10000) return 15;
      if (value <= 25000) return 15 + Math.ceil((value - 10000) / 1000) * 2;
      if (value <= 125000) return 45 + Math.ceil((value - 25000) / 1000) * 3;
      if (value <= 250000) return 345 + Math.ceil((value - 125000) / 1000) * 4;
      return 845 + Math.ceil((value - 250000) / 1000) * 5;
    },
    description: "Progressive rate from $2 to $5 per $1,000",
  },

  // Nunavut: Same as Northwest Territories
  NU: {
    calculate: (value) => {
      if (value <= 10000) return 15;
      if (value <= 25000) return 15 + Math.ceil((value - 10000) / 1000) * 2;
      if (value <= 125000) return 45 + Math.ceil((value - 25000) / 1000) * 3;
      if (value <= 250000) return 345 + Math.ceil((value - 125000) / 1000) * 4;
      return 845 + Math.ceil((value - 250000) / 1000) * 5;
    },
    description: "Progressive rate from $2 to $5 per $1,000",
  },

  // Ontario: $5 per $1,000 on first $50,000, then $15 per $1,000 over $50,000
  ON: {
    calculate: (value) => {
      if (value <= 50000) {
        return Math.ceil(value / 1000) * 5;
      }
      const first50k = 250; // $5 × 50
      const over50k = value - 50000;
      return first50k + Math.ceil(over50k / 1000) * 15;
    },
    description: "$5 per $1,000 on first $50,000, $15 per $1,000 thereafter",
  },

  // Prince Edward Island: $50 up to $10,000, then $4 per $1,000, capped at $400 for estates over $100,000
  PE: {
    calculate: (value) => {
      if (value <= 10000) return 50;
      if (value <= 25000) return 50 + Math.ceil((value - 10000) / 1000) * 4;
      if (value <= 50000) return 110 + Math.ceil((value - 25000) / 1000) * 4;
      if (value <= 100000) return 210 + Math.ceil((value - 50000) / 1000) * 4;
      return 400; // Capped at $400 for estates over $100,000
    },
    description:
      "$50 base + $4 per $1,000, capped at $400 for estates over $100,000",
  },

  // Quebec: No probate fees (notarial wills don't require probate)
  QC: {
    calculate: () => 0,
    description: "No probate fees for notarial wills",
  },

  // Saskatchewan: $7 per $1,000
  SK: {
    calculate: (value) => Math.ceil(value / 1000) * 7,
    description: "$7 per $1,000",
  },

  // Yukon: $140 flat fee
  YT: {
    calculate: () => 140,
    description: "Flat fee of $140",
  },
};

/**
 * Calculate probate fees for a given province and estate value
 *
 * @param province - Canadian province code
 * @param estateValue - Total estate value subject to probate
 * @returns Probate fee amount
 */
export function calculateProbateFees(
  province: CanadianProvince,
  estateValue: number,
): number {
  const validValue = Math.max(0, estateValue);
  const structure = PROBATE_FEE_STRUCTURES[province];

  if (!structure) {
    throw new Error(`Unknown province: ${province}`);
  }

  return structure.calculate(validValue);
}

/**
 * Get probate fee description for a province
 */
export function getProbateFeeDescription(province: CanadianProvince): string {
  return PROBATE_FEE_STRUCTURES[province]?.description ?? "Unknown";
}

// =============================================================================
// Income Tax Calculation
// =============================================================================

/**
 * Calculate progressive tax using bracket system
 */
function calculateProgressiveTax(
  income: number,
  brackets: { threshold: number; rate: number }[],
): number {
  if (income <= 0 || brackets.length === 0) return 0;

  let tax = 0;
  let remainingIncome = income;

  for (let i = 0; i < brackets.length; i++) {
    const currentBracket = brackets[i];
    if (!currentBracket) continue;

    const nextThreshold = brackets[i + 1]?.threshold ?? Infinity;
    const taxableInBracket = Math.min(
      remainingIncome,
      nextThreshold - currentBracket.threshold,
    );

    if (taxableInBracket > 0) {
      tax += taxableInBracket * currentBracket.rate;
      remainingIncome -= taxableInBracket;
    }

    if (remainingIncome <= 0) break;
  }

  return tax;
}

/**
 * Calculate final income tax for deceased
 *
 * @param income - Final year income
 * @param province - Province of residence
 * @returns Estimated income tax amount
 */
export function calculateFinalIncomeTax(
  income: number,
  province: CanadianProvince,
): number {
  const validIncome = Math.max(0, income);

  if (validIncome === 0) return 0;

  // Calculate federal tax
  const federalTax = calculateProgressiveTax(
    validIncome,
    FEDERAL_TAX_BRACKETS_2024,
  );

  // Calculate provincial tax
  const provincialBrackets = PROVINCIAL_TAX_BRACKETS_2024[province];
  const provincialTax = calculateProgressiveTax(
    validIncome,
    provincialBrackets,
  );

  return federalTax + provincialTax;
}

// =============================================================================
// Capital Gains Calculation
// =============================================================================

/**
 * Capital gains inclusion rate in Canada (50%)
 */
const CAPITAL_GAINS_INCLUSION_RATE = 0.5;

/**
 * Calculate capital gains tax on deemed disposition at death
 *
 * @param assets - Array of assets with current value and cost basis
 * @param province - Province for tax rate calculation
 * @param existingIncome - Other income for marginal rate calculation
 * @returns Capital gains breakdown
 */
export function calculateCapitalGainsTax(
  assets: AssetForSettling[],
  province: CanadianProvince,
  existingIncome: number,
): CapitalGainsBreakdown {
  let totalGains = 0;
  let assetsWithGains = 0;
  let exemptAssets = 0;

  for (const asset of assets) {
    if (asset.isExempt) {
      exemptAssets++;
      continue;
    }

    const gain = Math.max(0, asset.currentValue - asset.costBasis);
    if (gain > 0) {
      totalGains += gain;
      assetsWithGains++;
    }
  }

  // Taxable amount is 50% of capital gains in Canada
  const taxableGains = totalGains * CAPITAL_GAINS_INCLUSION_RATE;

  // Calculate tax at marginal rate
  // The capital gains are added on top of existing income
  const totalIncome = existingIncome + taxableGains;
  const taxWithGains = calculateFinalIncomeTax(totalIncome, province);
  const taxWithoutGains = calculateFinalIncomeTax(existingIncome, province);
  const capitalGainsTax = taxWithGains - taxWithoutGains;

  return {
    totalGains,
    taxableGains,
    capitalGainsTax,
    assetsWithGains,
    exemptAssets,
  };
}

// =============================================================================
// Professional Fees Calculation
// =============================================================================

/**
 * Calculate professional fees for estate administration
 *
 * @param estateValue - Total estate value
 * @param config - Professional fees configuration
 * @returns Professional fees breakdown
 */
export function calculateProfessionalFees(
  estateValue: number,
  config: ProfessionalFeesConfig,
): ProfessionalFeesBreakdown {
  const validValue = Math.max(0, estateValue);

  // Calculate legal fees
  const legalFees =
    config.legal.type === "fixed"
      ? config.legal.amount
      : validValue * (config.legal.rate / 100);

  // Calculate accounting fees
  const accountingFees =
    config.accounting.type === "fixed"
      ? config.accounting.amount
      : validValue * (config.accounting.rate / 100);

  // Calculate executor fees
  const executorFees =
    config.executor.type === "waived"
      ? 0
      : validValue * (config.executor.rate / 100);

  const total = legalFees + accountingFees + executorFees;

  return {
    legalFees,
    accountingFees,
    executorFees,
    total,
  };
}

// =============================================================================
// Main Calculation Function
// =============================================================================

/**
 * Calculate total settling requirements with full breakdown
 *
 * Implements the formula from PRD §7.1:
 * Total = Probate Fees + Final Income Tax + Capital Gains Tax + Professional Fees + Funeral Expenses
 *
 * @param input - All input parameters for calculation
 * @returns Full breakdown of settling requirements
 */
export function calculateSettlingRequirements(
  input: SettlingRequirementsInput,
): SettlingRequirementsResult {
  // Validate inputs
  const estateValue = Math.max(0, input.estateValue);
  const finalYearIncome = Math.max(0, input.finalYearIncome);

  // Calculate total asset values for audit trail
  const totalAssetValue = input.assets.reduce(
    (sum, asset) => sum + Math.max(0, asset.currentValue),
    0,
  );
  const totalCostBasis = input.assets.reduce(
    (sum, asset) => sum + Math.max(0, asset.costBasis),
    0,
  );

  // 1. Probate fees
  const probateFees = calculateProbateFees(input.province, estateValue);

  // 2. Final income tax
  const finalIncomeTax = calculateFinalIncomeTax(
    finalYearIncome,
    input.province,
  );

  // 3. Capital gains tax on deemed disposition
  const capitalGainsBreakdown = calculateCapitalGainsTax(
    input.assets,
    input.province,
    finalYearIncome,
  );

  // 4. Professional fees
  const feesConfig: ProfessionalFeesConfig = {
    legal: input.professionalFees?.legal ?? DEFAULT_PROFESSIONAL_FEES.legal,
    accounting:
      input.professionalFees?.accounting ??
      DEFAULT_PROFESSIONAL_FEES.accounting,
    executor:
      input.professionalFees?.executor ?? DEFAULT_PROFESSIONAL_FEES.executor,
  };
  const professionalFees = calculateProfessionalFees(estateValue, feesConfig);

  // 5. Funeral expenses
  const funeralExpenses = input.funeralExpenses ?? DEFAULT_FUNERAL_EXPENSES;

  // Calculate total
  const totalSettlingRequirements =
    probateFees +
    finalIncomeTax +
    capitalGainsBreakdown.capitalGainsTax +
    professionalFees.total +
    funeralExpenses;

  return {
    probateFees,
    finalIncomeTax,
    capitalGainsTax: capitalGainsBreakdown.capitalGainsTax,
    capitalGainsBreakdown,
    professionalFees,
    funeralExpenses,
    totalSettlingRequirements,
    inputsUsed: {
      province: input.province,
      estateValue,
      finalYearIncome,
      assetCount: input.assets.length,
      totalAssetValue,
      totalCostBasis,
    },
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Rounds a number to 2 decimal places (for currency display)
 */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate settling requirements with all values rounded to 2 decimal places
 * Useful for display and API responses
 */
export function calculateSettlingRequirementsRounded(
  input: SettlingRequirementsInput,
): SettlingRequirementsResult {
  const result = calculateSettlingRequirements(input);

  return {
    probateFees: roundCurrency(result.probateFees),
    finalIncomeTax: roundCurrency(result.finalIncomeTax),
    capitalGainsTax: roundCurrency(result.capitalGainsTax),
    capitalGainsBreakdown: {
      totalGains: roundCurrency(result.capitalGainsBreakdown.totalGains),
      taxableGains: roundCurrency(result.capitalGainsBreakdown.taxableGains),
      capitalGainsTax: roundCurrency(
        result.capitalGainsBreakdown.capitalGainsTax,
      ),
      assetsWithGains: result.capitalGainsBreakdown.assetsWithGains,
      exemptAssets: result.capitalGainsBreakdown.exemptAssets,
    },
    professionalFees: {
      legalFees: roundCurrency(result.professionalFees.legalFees),
      accountingFees: roundCurrency(result.professionalFees.accountingFees),
      executorFees: roundCurrency(result.professionalFees.executorFees),
      total: roundCurrency(result.professionalFees.total),
    },
    funeralExpenses: roundCurrency(result.funeralExpenses),
    totalSettlingRequirements: roundCurrency(result.totalSettlingRequirements),
    inputsUsed: result.inputsUsed,
  };
}

/**
 * Get list of all supported provinces
 */
export function getSupportedProvinces(): CanadianProvince[] {
  return Object.keys(PROVINCE_NAMES) as CanadianProvince[];
}

/**
 * Check if a province code is valid
 */
export function isValidProvince(code: string): code is CanadianProvince {
  return code in PROVINCE_NAMES;
}
