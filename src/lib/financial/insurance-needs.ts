/**
 * Insurance Needs Calculation Engine
 *
 * Implements the total insurance needs logic as specified in Issue #62.
 * All functions are pure and side-effect free for easy testing.
 *
 * Formula:
 * - Income Replacement = (clientIncome + spouseIncome?) × replacementPercent × years
 * - Debt Payoff = sum of all debt balances
 * - Estate Buffer = fixed amount OR percentage of total assets
 * - Gross Needs = Income Replacement + Debt Payoff + Estate Buffer
 * - Net Needs = max(Gross Needs - Existing Coverage - Liquid Assets, 0)
 */

/**
 * Configuration for estate buffer calculation
 */
export type EstateBufferConfig =
  | { type: "fixed"; amount: number }
  | { type: "percentage"; percentage: number };

/**
 * Input parameters for insurance needs calculation
 */
export interface InsuranceNeedsInput {
  /** Client's annual income in CAD */
  clientIncome: number;
  /** Spouse's annual income in CAD (optional) */
  spouseIncome?: number;
  /** Whether to include spouse income in calculation */
  includeSpouseIncome: boolean;
  /** Percentage of income to replace (e.g., 70 for 70%) */
  incomeReplacementPercent: number;
  /** Number of years to replace income */
  replacementDurationYears: number;
  /** Existing life insurance coverage amount in CAD */
  existingLifeInsuranceCoverage: number;
  /** Total debt balance across all debts in CAD */
  totalDebts: number;
  /** Total liquid assets in CAD (easily accessible) */
  liquidAssets: number;
  /** Total assets in CAD (used for percentage-based estate buffer) */
  totalAssets: number;
  /** Estate buffer configuration */
  estateBuffer: EstateBufferConfig;
}

/**
 * Result of insurance needs calculation with component breakdown
 */
export interface InsuranceNeedsResult {
  /** Income replacement needs (income × percent × years) */
  incomeReplacementNeeds: number;
  /** Total debt payoff needs */
  debtPayoffNeeds: number;
  /** Estate/settling buffer amount */
  estateBufferNeeds: number;
  /** Gross needs before deductions */
  grossNeeds: number;
  /** Existing coverage being deducted */
  existingCoverage: number;
  /** Liquid assets being deducted */
  liquidAssets: number;
  /** Final total insurance needs (floored at 0) */
  totalInsuranceNeeds: number;
  /** Input parameters used for calculation (for audit trail) */
  inputsUsed: {
    clientIncome: number;
    spouseIncome: number;
    includeSpouseIncome: boolean;
    incomeReplacementPercent: number;
    replacementDurationYears: number;
    estateBufferType: "fixed" | "percentage";
    estateBufferValue: number;
  };
}

/**
 * Default estate buffer configuration
 * $15,000 is a common estimate for funeral costs and probate fees in Canada
 */
export const DEFAULT_ESTATE_BUFFER: EstateBufferConfig = {
  type: "fixed",
  amount: 15000,
};

/**
 * Calculates income replacement needs
 *
 * Formula: (clientIncome + spouseIncome?) × (replacementPercent / 100) × years
 *
 * @param clientIncome - Client's annual income
 * @param spouseIncome - Spouse's annual income (optional)
 * @param includeSpouseIncome - Whether to include spouse income
 * @param replacementPercent - Percentage to replace (e.g., 70 for 70%)
 * @param years - Number of years to replace
 * @returns Income replacement needs amount
 */
export function calculateIncomeReplacementNeeds(
  clientIncome: number,
  spouseIncome: number | undefined,
  includeSpouseIncome: boolean,
  replacementPercent: number,
  years: number,
): number {
  // Validate inputs - negative values treated as 0
  const validClientIncome = Math.max(0, clientIncome);
  const validSpouseIncome =
    includeSpouseIncome && spouseIncome ? Math.max(0, spouseIncome) : 0;
  const validPercent = Math.max(0, Math.min(100, replacementPercent));
  const validYears = Math.max(0, years);

  const totalIncome = validClientIncome + validSpouseIncome;
  const replacementFactor = validPercent / 100;

  return totalIncome * replacementFactor * validYears;
}

/**
 * Calculates estate buffer needs based on configuration
 *
 * @param config - Estate buffer configuration (fixed or percentage)
 * @param totalAssets - Total assets (used for percentage calculation)
 * @returns Estate buffer amount
 */
export function calculateEstateBufferNeeds(
  config: EstateBufferConfig,
  totalAssets: number,
): number {
  const validTotalAssets = Math.max(0, totalAssets);

  if (config.type === "fixed") {
    return Math.max(0, config.amount);
  }

  // Percentage of total assets
  const validPercentage = Math.max(0, Math.min(100, config.percentage));
  return validTotalAssets * (validPercentage / 100);
}

/**
 * Calculates total insurance needs with full breakdown
 *
 * Implements the formula from Issue #62:
 * - Gross Needs = Income Replacement + Debt Payoff + Estate Buffer
 * - Net Needs = max(Gross Needs - Existing Coverage - Liquid Assets, 0)
 *
 * @param input - All input parameters for calculation
 * @returns Full breakdown of insurance needs
 */
export function calculateInsuranceNeeds(
  input: InsuranceNeedsInput,
): InsuranceNeedsResult {
  // Calculate income replacement needs
  const incomeReplacementNeeds = calculateIncomeReplacementNeeds(
    input.clientIncome,
    input.spouseIncome,
    input.includeSpouseIncome,
    input.incomeReplacementPercent,
    input.replacementDurationYears,
  );

  // Debt payoff is simply the sum of all debts (already provided as total)
  const debtPayoffNeeds = Math.max(0, input.totalDebts);

  // Calculate estate buffer
  const estateBufferNeeds = calculateEstateBufferNeeds(
    input.estateBuffer,
    input.totalAssets,
  );

  // Calculate gross needs
  const grossNeeds =
    incomeReplacementNeeds + debtPayoffNeeds + estateBufferNeeds;

  // Calculate deductions
  const existingCoverage = Math.max(0, input.existingLifeInsuranceCoverage);
  const liquidAssets = Math.max(0, input.liquidAssets);

  // Calculate net needs (floored at 0)
  const totalInsuranceNeeds = Math.max(
    0,
    grossNeeds - existingCoverage - liquidAssets,
  );

  return {
    incomeReplacementNeeds,
    debtPayoffNeeds,
    estateBufferNeeds,
    grossNeeds,
    existingCoverage,
    liquidAssets,
    totalInsuranceNeeds,
    inputsUsed: {
      clientIncome: input.clientIncome,
      spouseIncome: input.spouseIncome ?? 0,
      includeSpouseIncome: input.includeSpouseIncome,
      incomeReplacementPercent: input.incomeReplacementPercent,
      replacementDurationYears: input.replacementDurationYears,
      estateBufferType: input.estateBuffer.type,
      estateBufferValue:
        input.estateBuffer.type === "fixed"
          ? input.estateBuffer.amount
          : input.estateBuffer.percentage,
    },
  };
}

/**
 * Rounds a number to 2 decimal places (for currency display)
 */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculates insurance needs with all values rounded to 2 decimal places
 * Useful for display and API responses
 */
export function calculateInsuranceNeedsRounded(
  input: InsuranceNeedsInput,
): InsuranceNeedsResult {
  const result = calculateInsuranceNeeds(input);

  return {
    incomeReplacementNeeds: roundCurrency(result.incomeReplacementNeeds),
    debtPayoffNeeds: roundCurrency(result.debtPayoffNeeds),
    estateBufferNeeds: roundCurrency(result.estateBufferNeeds),
    grossNeeds: roundCurrency(result.grossNeeds),
    existingCoverage: roundCurrency(result.existingCoverage),
    liquidAssets: roundCurrency(result.liquidAssets),
    totalInsuranceNeeds: roundCurrency(result.totalInsuranceNeeds),
    inputsUsed: result.inputsUsed,
  };
}
