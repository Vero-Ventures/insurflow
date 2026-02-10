/**
 * US Settling Requirements Calculation Engine
 *
 * Calculates the costs associated with settling an estate in the United States:
 * - State-specific probate fees
 * - Federal estate tax (for estates over exemption threshold)
 * - State estate/inheritance taxes (applicable states only)
 * - Final income taxes
 * - Capital gains (step-up in basis typically eliminates this)
 * - Professional fees (legal, accounting, executor)
 *
 * All functions are pure and side-effect free for easy testing.
 */

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * US States and DC
 */
export type USState =
  | "AL"
  | "AK"
  | "AZ"
  | "AR"
  | "CA"
  | "CO"
  | "CT"
  | "DE"
  | "FL"
  | "GA"
  | "HI"
  | "ID"
  | "IL"
  | "IN"
  | "IA"
  | "KS"
  | "KY"
  | "LA"
  | "ME"
  | "MD"
  | "MA"
  | "MI"
  | "MN"
  | "MS"
  | "MO"
  | "MT"
  | "NE"
  | "NV"
  | "NH"
  | "NJ"
  | "NM"
  | "NY"
  | "NC"
  | "ND"
  | "OH"
  | "OK"
  | "OR"
  | "PA"
  | "RI"
  | "SC"
  | "SD"
  | "TN"
  | "TX"
  | "UT"
  | "VT"
  | "VA"
  | "WA"
  | "WV"
  | "WI"
  | "WY"
  | "DC";

/**
 * Asset for estate calculation
 * Note: In the US, most assets receive a "step-up" in basis at death,
 * which typically eliminates capital gains tax
 */
export interface USAssetForSettling {
  /** Current fair market value */
  currentValue: number;
  /** Original cost basis (for reference, though step-up usually applies) */
  costBasis: number;
  /** Asset type for categorization */
  type?: string;
  /** Asset name for reporting */
  name?: string;
}

/**
 * Professional fees configuration
 */
export interface USProfessionalFeesConfig {
  /** Legal fees - fixed amount or percentage of estate */
  legal:
    | { type: "fixed"; amount: number }
    | { type: "percentage"; rate: number };
  /** Accounting fees - fixed amount or percentage of estate */
  accounting:
    | { type: "fixed"; amount: number }
    | { type: "percentage"; rate: number };
  /** Executor compensation - percentage of estate value or waived */
  executor: { type: "percentage"; rate: number } | { type: "waived" };
}

/**
 * Input parameters for US settling requirements calculation
 */
export interface USSettlingRequirementsInput {
  /** State of residence at death */
  state: USState;
  /** Total estate value (gross estate) */
  estateValue: number;
  /** Client's final year income (for income tax calculation) */
  finalYearIncome: number;
  /** Assets in the estate */
  assets: USAssetForSettling[];
  /** Professional fees configuration (optional - uses defaults if not provided) */
  professionalFees?: Partial<USProfessionalFeesConfig>;
  /** Funeral and burial expenses estimate */
  funeralExpenses?: number;
}

/**
 * Breakdown of professional fees
 */
export interface USProfessionalFeesBreakdown {
  /** Legal fees (probate, estate administration) */
  legalFees: number;
  /** Accounting fees (final tax returns, estate accounting) */
  accountingFees: number;
  /** Executor/personal representative compensation */
  executorFees: number;
  /** Total professional fees */
  total: number;
}

/**
 * Result of US settling requirements calculation
 */
export interface USSettlingRequirementsResult {
  /** State-specific probate fees/costs */
  probateFees: number;
  /** Federal estate tax (if applicable) */
  federalEstateTax: number;
  /** State estate or inheritance tax (if applicable) */
  stateEstateTax: number;
  /** Final income tax estimate */
  finalIncomeTax: number;
  /** Professional fees breakdown */
  professionalFees: USProfessionalFeesBreakdown;
  /** Funeral and burial expenses */
  funeralExpenses: number;
  /** Total settling requirements */
  totalSettlingRequirements: number;
  /** Notes about the calculation */
  notes: string[];
  /** Input parameters used for calculation (for audit trail) */
  inputsUsed: {
    state: USState;
    stateName: string;
    estateValue: number;
    finalYearIncome: number;
    assetCount: number;
  };
}

// =============================================================================
// Constants & Rate Tables
// =============================================================================

/**
 * 2024 Federal estate tax exemption
 * This is the lifetime exemption amount
 */
export const FEDERAL_ESTATE_TAX_EXEMPTION_2024 = 13_610_000;

/**
 * Federal estate tax rate (flat rate on amounts over exemption)
 */
export const FEDERAL_ESTATE_TAX_RATE = 0.4;

/**
 * Default professional fees configuration for US estates
 */
export const US_DEFAULT_PROFESSIONAL_FEES: USProfessionalFeesConfig = {
  legal: { type: "percentage", rate: 3 }, // 3% is typical, ranges 2-5%
  accounting: { type: "fixed", amount: 3500 }, // $3,500 for final returns
  executor: { type: "percentage", rate: 2 }, // 2% is common, varies by state
};

/**
 * Default funeral expenses estimate (US average)
 */
export const US_DEFAULT_FUNERAL_EXPENSES = 12000;

/**
 * State display names
 */
export const US_STATE_NAMES: Record<USState, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "District of Columbia",
};

/**
 * States with estate taxes and their exemption thresholds (2024)
 * These states impose their own estate tax separate from federal
 */
const STATE_ESTATE_TAX_INFO: Partial<
  Record<
    USState,
    {
      exemption: number;
      topRate: number;
      type: "estate" | "inheritance" | "both";
    }
  >
> = {
  CT: { exemption: 13_610_000, topRate: 0.12, type: "estate" },
  DC: { exemption: 4_528_800, topRate: 0.16, type: "estate" },
  HI: { exemption: 5_490_000, topRate: 0.2, type: "estate" },
  IL: { exemption: 4_000_000, topRate: 0.16, type: "estate" },
  ME: { exemption: 6_410_000, topRate: 0.12, type: "estate" },
  MD: { exemption: 5_000_000, topRate: 0.16, type: "both" },
  MA: { exemption: 2_000_000, topRate: 0.16, type: "estate" },
  MN: { exemption: 3_000_000, topRate: 0.16, type: "estate" },
  NY: { exemption: 6_940_000, topRate: 0.16, type: "estate" },
  OR: { exemption: 1_000_000, topRate: 0.16, type: "estate" },
  RI: { exemption: 1_774_583, topRate: 0.16, type: "estate" },
  VT: { exemption: 5_000_000, topRate: 0.16, type: "estate" },
  WA: { exemption: 2_193_000, topRate: 0.2, type: "estate" },
  // Inheritance tax states (tax on beneficiaries, not estate)
  IA: { exemption: 0, topRate: 0.06, type: "inheritance" },
  KY: { exemption: 0, topRate: 0.16, type: "inheritance" },
  NE: { exemption: 100_000, topRate: 0.18, type: "inheritance" },
  NJ: { exemption: 0, topRate: 0.16, type: "inheritance" },
  PA: { exemption: 0, topRate: 0.15, type: "inheritance" },
};

/**
 * Probate fee structures by state
 * Many states use percentage-based fees, some have flat fees or court costs
 */
type ProbateFeeStructure =
  | { type: "percentage"; rates: { threshold: number; rate: number }[] }
  | { type: "flat"; amount: number }
  | { type: "statutory"; rates: { threshold: number; rate: number }[] }
  | { type: "reasonable"; estimatedRate: number };

const STATE_PROBATE_FEES: Record<USState, ProbateFeeStructure> = {
  // States with statutory fee schedules (attorney fees set by law)
  CA: {
    type: "statutory",
    rates: [
      { threshold: 100_000, rate: 0.04 },
      { threshold: 200_000, rate: 0.03 },
      { threshold: 1_000_000, rate: 0.02 },
      { threshold: 10_000_000, rate: 0.01 },
      { threshold: 25_000_000, rate: 0.005 },
      { threshold: Infinity, rate: 0.0025 },
    ],
  },
  // Most states use "reasonable" fees determined by court
  AL: { type: "reasonable", estimatedRate: 0.03 },
  AK: { type: "reasonable", estimatedRate: 0.025 },
  AZ: { type: "reasonable", estimatedRate: 0.025 },
  AR: { type: "statutory", rates: [{ threshold: Infinity, rate: 0.05 }] },
  CO: { type: "reasonable", estimatedRate: 0.02 },
  CT: { type: "flat", amount: 500 },
  DE: { type: "reasonable", estimatedRate: 0.025 },
  DC: { type: "reasonable", estimatedRate: 0.03 },
  FL: {
    type: "statutory",
    rates: [
      { threshold: 40_000, rate: 0.03 },
      { threshold: 70_000, rate: 0.025 },
      { threshold: 100_000, rate: 0.02 },
      { threshold: 1_000_000, rate: 0.015 },
      { threshold: 3_000_000, rate: 0.01 },
      { threshold: Infinity, rate: 0.005 },
    ],
  },
  GA: { type: "reasonable", estimatedRate: 0.025 },
  HI: { type: "reasonable", estimatedRate: 0.03 },
  ID: { type: "reasonable", estimatedRate: 0.025 },
  IL: { type: "reasonable", estimatedRate: 0.03 },
  IN: { type: "reasonable", estimatedRate: 0.025 },
  IA: { type: "statutory", rates: [{ threshold: Infinity, rate: 0.02 }] },
  KS: { type: "reasonable", estimatedRate: 0.025 },
  KY: { type: "reasonable", estimatedRate: 0.025 },
  LA: { type: "reasonable", estimatedRate: 0.025 },
  ME: { type: "reasonable", estimatedRate: 0.025 },
  MD: { type: "flat", amount: 1000 }, // Filing fees relatively low
  MA: { type: "reasonable", estimatedRate: 0.03 },
  MI: { type: "reasonable", estimatedRate: 0.025 },
  MN: { type: "reasonable", estimatedRate: 0.025 },
  MS: { type: "reasonable", estimatedRate: 0.025 },
  MO: { type: "statutory", rates: [{ threshold: Infinity, rate: 0.05 }] },
  MT: { type: "statutory", rates: [{ threshold: Infinity, rate: 0.03 }] },
  NE: { type: "reasonable", estimatedRate: 0.025 },
  NV: {
    type: "statutory",
    rates: [
      { threshold: 200_000, rate: 0.04 },
      { threshold: Infinity, rate: 0.02 },
    ],
  },
  NH: { type: "reasonable", estimatedRate: 0.025 },
  NJ: { type: "flat", amount: 750 },
  NM: { type: "reasonable", estimatedRate: 0.025 },
  NY: {
    type: "statutory",
    rates: [
      { threshold: 100_000, rate: 0.05 },
      { threshold: 600_000, rate: 0.04 },
      { threshold: 1_000_000, rate: 0.03 },
      { threshold: 5_000_000, rate: 0.025 },
      { threshold: Infinity, rate: 0.02 },
    ],
  },
  NC: { type: "flat", amount: 400 },
  ND: { type: "reasonable", estimatedRate: 0.025 },
  OH: { type: "reasonable", estimatedRate: 0.04 },
  OK: { type: "statutory", rates: [{ threshold: Infinity, rate: 0.05 }] },
  OR: { type: "reasonable", estimatedRate: 0.025 },
  PA: { type: "reasonable", estimatedRate: 0.03 },
  RI: { type: "reasonable", estimatedRate: 0.025 },
  SC: { type: "reasonable", estimatedRate: 0.025 },
  SD: { type: "reasonable", estimatedRate: 0.025 },
  TN: { type: "reasonable", estimatedRate: 0.025 },
  TX: { type: "statutory", rates: [{ threshold: Infinity, rate: 0.05 }] },
  UT: { type: "reasonable", estimatedRate: 0.025 },
  VT: { type: "reasonable", estimatedRate: 0.025 },
  VA: { type: "reasonable", estimatedRate: 0.025 },
  WA: { type: "reasonable", estimatedRate: 0.025 },
  WV: { type: "reasonable", estimatedRate: 0.025 },
  WI: { type: "reasonable", estimatedRate: 0.02 },
  WY: { type: "statutory", rates: [{ threshold: Infinity, rate: 0.1 }] },
};

/**
 * 2024 Federal income tax brackets (single filer - used for final return)
 */
const FEDERAL_INCOME_TAX_BRACKETS_2024 = [
  { threshold: 0, rate: 0.1 },
  { threshold: 11_600, rate: 0.12 },
  { threshold: 47_150, rate: 0.22 },
  { threshold: 100_525, rate: 0.24 },
  { threshold: 191_950, rate: 0.32 },
  { threshold: 243_725, rate: 0.35 },
  { threshold: 609_350, rate: 0.37 },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a value is a valid US state code
 */
export function isValidUSState(value: string): value is USState {
  return value in US_STATE_NAMES;
}

/**
 * Calculate tax using progressive brackets
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
    if (!currentBracket) break;

    const nextBracket = brackets[i + 1];
    const bracketFloor = currentBracket.threshold;
    const bracketCeiling = nextBracket?.threshold ?? Infinity;

    if (remainingIncome <= 0) break;

    const taxableInBracket = Math.min(
      remainingIncome,
      bracketCeiling - bracketFloor,
    );

    if (taxableInBracket > 0) {
      tax += taxableInBracket * currentBracket.rate;
      remainingIncome -= taxableInBracket;
    }
  }

  return tax;
}

// =============================================================================
// Calculation Functions
// =============================================================================

/**
 * Calculate state probate fees
 */
export function calculateUSProbateFees(
  estateValue: number,
  state: USState,
): number {
  if (estateValue <= 0) return 0;

  const feeStructure = STATE_PROBATE_FEES[state];

  switch (feeStructure.type) {
    case "flat":
      return feeStructure.amount;

    case "reasonable":
      return Math.round(estateValue * feeStructure.estimatedRate);

    case "percentage":
    case "statutory": {
      // Calculate fees using tiered rates
      let fees = 0;
      let remainingValue = estateValue;
      let previousThreshold = 0;

      for (const bracket of feeStructure.rates) {
        const bracketSize = bracket.threshold - previousThreshold;
        const taxableInBracket = Math.min(remainingValue, bracketSize);

        if (taxableInBracket > 0) {
          fees += taxableInBracket * bracket.rate;
          remainingValue -= taxableInBracket;
        }

        if (remainingValue <= 0) break;
        previousThreshold = bracket.threshold;
      }

      return Math.round(fees);
    }

    default:
      return Math.round(estateValue * 0.03); // Fallback 3%
  }
}

/**
 * Calculate federal estate tax
 * Only applies to estates exceeding the exemption threshold
 */
export function calculateFederalEstateTax(
  estateValue: number,
  exemption: number = FEDERAL_ESTATE_TAX_EXEMPTION_2024,
): number {
  if (estateValue <= exemption) return 0;

  const taxableAmount = estateValue - exemption;
  return Math.round(taxableAmount * FEDERAL_ESTATE_TAX_RATE);
}

/**
 * Calculate state estate or inheritance tax
 */
export function calculateStateEstateTax(
  estateValue: number,
  state: USState,
): {
  tax: number;
  type: "estate" | "inheritance" | "both" | "none";
  notes: string[];
} {
  const stateInfo = STATE_ESTATE_TAX_INFO[state];
  const notes: string[] = [];

  if (!stateInfo) {
    return {
      tax: 0,
      type: "none",
      notes: [
        `${US_STATE_NAMES[state]} has no state estate or inheritance tax`,
      ],
    };
  }

  if (stateInfo.type === "inheritance") {
    // Inheritance tax is paid by beneficiaries, estimate based on estate value
    // Actual tax depends on relationship of beneficiaries
    // Apply exemption if defined (e.g., Nebraska has $100,000 exemption)
    const taxableAmount = Math.max(0, estateValue - stateInfo.exemption);
    if (taxableAmount <= 0) {
      notes.push(
        `Estate below ${US_STATE_NAMES[state]} inheritance tax exemption of $${stateInfo.exemption.toLocaleString()}`,
      );
      return { tax: 0, type: "inheritance", notes };
    }
    // Use 50% estimate since actual tax depends on beneficiary relationships
    const estimatedTax = Math.round(taxableAmount * stateInfo.topRate * 0.5);
    notes.push(
      `${US_STATE_NAMES[state]} has an inheritance tax (paid by beneficiaries)`,
    );
    notes.push(
      `Actual tax depends on beneficiary relationships; estimate shown`,
    );
    return { tax: estimatedTax, type: "inheritance", notes };
  }

  if (estateValue <= stateInfo.exemption) {
    notes.push(
      `Estate below ${US_STATE_NAMES[state]} exemption of $${stateInfo.exemption.toLocaleString()}`,
    );
    return { tax: 0, type: stateInfo.type, notes };
  }

  // Simplified calculation using top rate on amount over exemption
  const taxableAmount = estateValue - stateInfo.exemption;
  const tax = Math.round(taxableAmount * stateInfo.topRate);

  notes.push(
    `${US_STATE_NAMES[state]} estate tax on amount over $${stateInfo.exemption.toLocaleString()}`,
  );

  return { tax, type: stateInfo.type, notes };
}

/**
 * Calculate final income tax for the year of death
 */
export function calculateUSFinalIncomeTax(finalYearIncome: number): number {
  if (finalYearIncome <= 0) return 0;

  // Federal income tax
  const federalTax = calculateProgressiveTax(
    finalYearIncome,
    FEDERAL_INCOME_TAX_BRACKETS_2024,
  );

  // Estimate state income tax at 5% average (varies widely by state)
  const stateIncomeTaxEstimate = finalYearIncome * 0.05;

  return Math.round(federalTax + stateIncomeTaxEstimate);
}

/**
 * Calculate a fee based on fixed amount or percentage of estate value
 */
function calculateFee(
  feeConfig:
    | { type: "fixed"; amount: number }
    | { type: "percentage"; rate: number },
  estateValue: number,
): number {
  if (feeConfig.type === "fixed") {
    return feeConfig.amount;
  }
  return Math.round(estateValue * (feeConfig.rate / 100));
}

/**
 * Calculate professional fees
 */
export function calculateUSProfessionalFees(
  estateValue: number,
  config: USProfessionalFeesConfig = US_DEFAULT_PROFESSIONAL_FEES,
): USProfessionalFeesBreakdown {
  const safeEstateValue = Math.max(0, estateValue);

  const legalFees = calculateFee(config.legal, safeEstateValue);
  const accountingFees = calculateFee(config.accounting, safeEstateValue);
  const executorFees =
    config.executor.type === "waived"
      ? 0
      : Math.round(safeEstateValue * (config.executor.rate / 100));

  return {
    legalFees,
    accountingFees,
    executorFees,
    total: legalFees + accountingFees + executorFees,
  };
}

// =============================================================================
// Main Calculation Function
// =============================================================================

/**
 * Calculate all settling requirements for a US estate
 */
export function calculateUSSettlingRequirements(
  input: USSettlingRequirementsInput,
): USSettlingRequirementsResult {
  const {
    state,
    estateValue,
    finalYearIncome,
    assets,
    professionalFees: customFees,
    funeralExpenses = US_DEFAULT_FUNERAL_EXPENSES,
  } = input;

  const notes: string[] = [];

  // Merge custom fees with defaults
  const feesConfig: USProfessionalFeesConfig = {
    ...US_DEFAULT_PROFESSIONAL_FEES,
    ...customFees,
  };

  // Calculate each component
  const probateFees = calculateUSProbateFees(estateValue, state);
  const federalEstateTax = calculateFederalEstateTax(estateValue);
  const stateEstateTaxResult = calculateStateEstateTax(estateValue, state);
  const finalIncomeTax = calculateUSFinalIncomeTax(finalYearIncome);
  const professionalFeesResult = calculateUSProfessionalFees(
    estateValue,
    feesConfig,
  );

  // Add notes
  notes.push(...stateEstateTaxResult.notes);

  if (federalEstateTax === 0) {
    notes.push(
      `Estate below federal exemption of $${FEDERAL_ESTATE_TAX_EXEMPTION_2024.toLocaleString()}`,
    );
  }

  // Note about step-up in basis
  notes.push(
    "Assets receive step-up in basis at death, typically eliminating capital gains",
  );

  // Calculate total
  const totalSettlingRequirements =
    probateFees +
    federalEstateTax +
    stateEstateTaxResult.tax +
    finalIncomeTax +
    professionalFeesResult.total +
    funeralExpenses;

  return {
    probateFees,
    federalEstateTax,
    stateEstateTax: stateEstateTaxResult.tax,
    finalIncomeTax,
    professionalFees: professionalFeesResult,
    funeralExpenses,
    totalSettlingRequirements,
    notes,
    inputsUsed: {
      state,
      stateName: US_STATE_NAMES[state],
      estateValue,
      finalYearIncome,
      assetCount: assets.length,
    },
  };
}

/**
 * Calculate settling requirements with rounded values
 */
export function calculateUSSettlingRequirementsRounded(
  input: USSettlingRequirementsInput,
): USSettlingRequirementsResult {
  const result = calculateUSSettlingRequirements(input);

  return {
    ...result,
    probateFees: Math.round(result.probateFees),
    federalEstateTax: Math.round(result.federalEstateTax),
    stateEstateTax: Math.round(result.stateEstateTax),
    finalIncomeTax: Math.round(result.finalIncomeTax),
    professionalFees: {
      ...result.professionalFees,
      legalFees: Math.round(result.professionalFees.legalFees),
      accountingFees: Math.round(result.professionalFees.accountingFees),
      executorFees: Math.round(result.professionalFees.executorFees),
      total: Math.round(result.professionalFees.total),
    },
    funeralExpenses: Math.round(result.funeralExpenses),
    totalSettlingRequirements: Math.round(result.totalSettlingRequirements),
  };
}
