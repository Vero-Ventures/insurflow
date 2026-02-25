import { createCalculationTrace } from "@/lib/calculation-trace";
import type { CalculationTrace } from "@/types/calculation-trace";

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

/** ±10% band around target for recommendation range (MVP rule) */
const RECOMMENDATION_BAND_FRACTION = 0.1;

export const INSURANCE_NEEDS_TRACE_SECTION_KEYS = [
  "income_replacement",
  "debt_payoff",
  "estate_buffer",
  "gross_needs",
  "deductions",
  "net_needs",
] as const;

/**
 * Recommendation band: low / target / high range for a key value.
 * Target is the single-number recommendation; low/high are derived (e.g. ±10%).
 */
export interface RecommendationBand {
  low: number;
  target: number;
  high: number;
}

/**
 * Derives a recommendation band from the target value (single place for MVP rule).
 * target = existing recommendation; low = target −10%, high = target +10%, all rounded.
 */
export function deriveRecommendationBand(target: number): RecommendationBand {
  const t = roundCurrency(target);
  return {
    low: roundCurrency(Math.max(0, t * (1 - RECOMMENDATION_BAND_FRACTION))),
    target: t,
    high: roundCurrency(t * (1 + RECOMMENDATION_BAND_FRACTION)),
  };
}

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
  /** Client's annual income in USD */
  clientIncome: number;
  /** Spouse's annual income in USD (optional) */
  spouseIncome?: number;
  /** Whether to include spouse income in calculation */
  includeSpouseIncome: boolean;
  /** Percentage of income to replace (e.g., 70 for 70%) */
  incomeReplacementPercent: number;
  /** Number of years to replace income */
  replacementDurationYears: number;
  /** Existing life insurance coverage amount in USD */
  existingLifeInsuranceCoverage: number;
  /** Total debt balance across all debts in USD */
  totalDebts: number;
  /** Total liquid assets in USD (easily accessible) */
  liquidAssets: number;
  /** Total assets in USD (used for percentage-based estate buffer) */
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
  /** Recommendation band for total insurance needs: low / target / high (target = totalInsuranceNeeds; ±10% MVP) */
  totalInsuranceNeedsBand?: RecommendationBand;
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

export interface InsuranceNeedsCalculationWithTraceResult {
  result: InsuranceNeedsResult;
  trace: CalculationTrace;
}

interface InsuranceNeedsIntermediates {
  spouseIncomeRaw: number | undefined;
  validClientIncome: number;
  validSpouseIncome: number | null;
  includedSpouseIncome: number;
  validPercent: number;
  validYears: number;
  replacementFactor: number;
  totalIncomeForReplacement: number;
  validDebtTotal: number;
  validTotalAssets: number;
  validExistingCoverage: number;
  validLiquidAssets: number;
  totalDeductions: number;
  netBeforeFloor: number;
  estateBufferConfiguredValue: number;
  normalizedEstateBufferValue: number;
}

interface InsuranceNeedsCoreOutput {
  result: InsuranceNeedsResult;
  intermediates: InsuranceNeedsIntermediates;
}

/**
 * Default estate buffer configuration
 * $15,000 is a common estimate for funeral costs and estate settlement expenses
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

function buildInsuranceNeedsTrace(
  input: InsuranceNeedsInput,
  result: InsuranceNeedsResult,
  intermediates: InsuranceNeedsIntermediates,
  options?: { rounded?: boolean },
): CalculationTrace {
  const mapNumber = options?.rounded ? roundCurrency : (value: number) => value;
  const estateBufferValueUnit =
    input.estateBuffer.type === "fixed" ? "currency" : "percent";

  return createCalculationTrace([
    {
      key: "income_replacement",
      label: "Income replacement",
      result: mapNumber(result.incomeReplacementNeeds),
      items: [
        {
          key: "client_income",
          label: "Client income",
          value: mapNumber(input.clientIncome),
          kind: "input",
          unit: "currency",
        },
        {
          key: "spouse_income",
          label: "Spouse income",
          value:
            intermediates.spouseIncomeRaw == null
              ? null
              : mapNumber(intermediates.spouseIncomeRaw),
          kind: "input",
          unit: "currency",
        },
        {
          key: "include_spouse_income",
          label: "Include spouse income",
          value: input.includeSpouseIncome ? "yes" : "no",
          kind: "assumption",
        },
        {
          key: "income_replacement_percent",
          label: "Income replacement percent",
          value: mapNumber(input.incomeReplacementPercent),
          kind: "assumption",
          unit: "percent",
        },
        {
          key: "replacement_duration_years",
          label: "Replacement duration",
          value: mapNumber(input.replacementDurationYears),
          kind: "assumption",
          unit: "years",
        },
        {
          key: "normalized_client_income",
          label: "Normalized client income",
          value: mapNumber(intermediates.validClientIncome),
          kind: "intermediate",
          unit: "currency",
        },
        {
          key: "normalized_spouse_income",
          label: "Normalized spouse income",
          value:
            intermediates.validSpouseIncome == null
              ? null
              : mapNumber(intermediates.validSpouseIncome),
          kind: "intermediate",
          unit: "currency",
        },
        {
          key: "included_spouse_income",
          label: "Included spouse income",
          value: mapNumber(intermediates.includedSpouseIncome),
          kind: "intermediate",
          unit: "currency",
        },
        {
          key: "normalized_replacement_percent",
          label: "Normalized replacement percent",
          value: mapNumber(intermediates.validPercent),
          kind: "intermediate",
          unit: "percent",
        },
        {
          key: "replacement_factor",
          label: "Replacement factor",
          value: mapNumber(intermediates.replacementFactor),
          kind: "intermediate",
          unit: "ratio",
        },
        {
          key: "normalized_replacement_years",
          label: "Normalized replacement years",
          value: mapNumber(intermediates.validYears),
          kind: "intermediate",
          unit: "years",
        },
        {
          key: "total_income_for_replacement",
          label: "Income used for replacement",
          value: mapNumber(intermediates.totalIncomeForReplacement),
          kind: "intermediate",
          unit: "currency",
        },
        {
          key: "income_replacement_needs",
          label: "Income replacement needs",
          value: mapNumber(result.incomeReplacementNeeds),
          kind: "result",
          unit: "currency",
        },
      ],
    },
    {
      key: "debt_payoff",
      label: "Debt payoff",
      result: mapNumber(result.debtPayoffNeeds),
      items: [
        {
          key: "total_debts",
          label: "Total debts",
          value: mapNumber(input.totalDebts),
          kind: "input",
          unit: "currency",
        },
        {
          key: "normalized_total_debts",
          label: "Normalized total debts",
          value: mapNumber(intermediates.validDebtTotal),
          kind: "intermediate",
          unit: "currency",
        },
        {
          key: "debt_payoff_needs",
          label: "Debt payoff needs",
          value: mapNumber(result.debtPayoffNeeds),
          kind: "result",
          unit: "currency",
        },
      ],
    },
    {
      key: "estate_buffer",
      label: "Estate buffer",
      result: mapNumber(result.estateBufferNeeds),
      items: [
        {
          key: "estate_buffer_type",
          label: "Estate buffer method",
          value: input.estateBuffer.type,
          kind: "assumption",
        },
        {
          key: "estate_buffer_config_value",
          label: "Estate buffer configured value",
          value: mapNumber(intermediates.estateBufferConfiguredValue),
          kind: "assumption",
          unit: estateBufferValueUnit,
        },
        {
          key: "total_assets",
          label: "Total assets",
          value: mapNumber(input.totalAssets),
          kind: "input",
          unit: "currency",
        },
        {
          key: "normalized_total_assets",
          label: "Normalized total assets",
          value: mapNumber(intermediates.validTotalAssets),
          kind: "intermediate",
          unit: "currency",
        },
        {
          key: "normalized_estate_buffer_value",
          label: "Normalized estate buffer value",
          value: mapNumber(intermediates.normalizedEstateBufferValue),
          kind: "intermediate",
          unit: estateBufferValueUnit,
        },
        {
          key: "estate_buffer_needs",
          label: "Estate buffer needs",
          value: mapNumber(result.estateBufferNeeds),
          kind: "result",
          unit: "currency",
        },
      ],
    },
    {
      key: "gross_needs",
      label: "Gross needs",
      result: mapNumber(result.grossNeeds),
      items: [
        {
          key: "income_replacement_needs",
          label: "Income replacement needs",
          value: mapNumber(result.incomeReplacementNeeds),
          kind: "intermediate",
          unit: "currency",
        },
        {
          key: "debt_payoff_needs",
          label: "Debt payoff needs",
          value: mapNumber(result.debtPayoffNeeds),
          kind: "intermediate",
          unit: "currency",
        },
        {
          key: "estate_buffer_needs",
          label: "Estate buffer needs",
          value: mapNumber(result.estateBufferNeeds),
          kind: "intermediate",
          unit: "currency",
        },
        {
          key: "gross_needs",
          label: "Gross insurance needs",
          value: mapNumber(result.grossNeeds),
          kind: "result",
          unit: "currency",
        },
      ],
    },
    {
      key: "deductions",
      label: "Existing resources",
      result: mapNumber(intermediates.totalDeductions),
      items: [
        {
          key: "existing_life_insurance_coverage",
          label: "Existing life insurance coverage",
          value: mapNumber(input.existingLifeInsuranceCoverage),
          kind: "input",
          unit: "currency",
        },
        {
          key: "liquid_assets",
          label: "Liquid assets",
          value: mapNumber(input.liquidAssets),
          kind: "input",
          unit: "currency",
        },
        {
          key: "normalized_existing_coverage",
          label: "Normalized existing coverage",
          value: mapNumber(intermediates.validExistingCoverage),
          kind: "intermediate",
          unit: "currency",
        },
        {
          key: "normalized_liquid_assets",
          label: "Normalized liquid assets",
          value: mapNumber(intermediates.validLiquidAssets),
          kind: "intermediate",
          unit: "currency",
        },
        {
          key: "total_deductions",
          label: "Total deductions",
          value: mapNumber(intermediates.totalDeductions),
          kind: "result",
          unit: "currency",
        },
      ],
    },
    {
      key: "net_needs",
      label: "Net insurance needs",
      result: mapNumber(result.totalInsuranceNeeds),
      notes:
        intermediates.netBeforeFloor < 0
          ? ["Net insurance needs are floored at zero."]
          : undefined,
      items: [
        {
          key: "gross_needs",
          label: "Gross insurance needs",
          value: mapNumber(result.grossNeeds),
          kind: "intermediate",
          unit: "currency",
        },
        {
          key: "total_deductions",
          label: "Total deductions",
          value: mapNumber(intermediates.totalDeductions),
          kind: "intermediate",
          unit: "currency",
        },
        {
          key: "net_needs_before_floor",
          label: "Net needs before floor",
          value: mapNumber(intermediates.netBeforeFloor),
          kind: "intermediate",
          unit: "currency",
        },
        {
          key: "total_insurance_needs",
          label: "Total insurance needs",
          value: mapNumber(result.totalInsuranceNeeds),
          kind: "result",
          unit: "currency",
        },
      ],
    },
  ]);
}

function calculateInsuranceNeedsCore(
  input: InsuranceNeedsInput,
): InsuranceNeedsCoreOutput {
  const spouseIncomeRaw = input.spouseIncome;
  const validClientIncome = Math.max(0, input.clientIncome);
  const validSpouseIncome =
    spouseIncomeRaw == null ? null : Math.max(0, spouseIncomeRaw);
  const includedSpouseIncome =
    input.includeSpouseIncome && spouseIncomeRaw != null
      ? Math.max(0, spouseIncomeRaw)
      : 0;
  const validPercent = Math.max(
    0,
    Math.min(100, input.incomeReplacementPercent),
  );
  const validYears = Math.max(0, input.replacementDurationYears);
  const replacementFactor = validPercent / 100;
  const totalIncomeForReplacement = validClientIncome + includedSpouseIncome;

  // Calculate income replacement needs
  const incomeReplacementNeeds = calculateIncomeReplacementNeeds(
    input.clientIncome,
    input.spouseIncome,
    input.includeSpouseIncome,
    input.incomeReplacementPercent,
    input.replacementDurationYears,
  );

  // Debt payoff is simply the sum of all debts (already provided as total)
  const validDebtTotal = Math.max(0, input.totalDebts);
  const debtPayoffNeeds = validDebtTotal;

  // Calculate estate buffer
  const estateBufferConfiguredValue =
    input.estateBuffer.type === "fixed"
      ? input.estateBuffer.amount
      : input.estateBuffer.percentage;
  const normalizedEstateBufferValue =
    input.estateBuffer.type === "fixed"
      ? Math.max(0, input.estateBuffer.amount)
      : Math.max(0, Math.min(100, input.estateBuffer.percentage));
  const validTotalAssets = Math.max(0, input.totalAssets);
  const estateBufferNeeds = calculateEstateBufferNeeds(
    input.estateBuffer,
    input.totalAssets,
  );

  // Calculate gross needs
  const grossNeeds =
    incomeReplacementNeeds + debtPayoffNeeds + estateBufferNeeds;

  // Calculate deductions
  const validExistingCoverage = Math.max(
    0,
    input.existingLifeInsuranceCoverage,
  );
  const validLiquidAssets = Math.max(0, input.liquidAssets);
  const existingCoverage = validExistingCoverage;
  const liquidAssets = validLiquidAssets;
  const totalDeductions = validExistingCoverage + validLiquidAssets;

  // Calculate net needs (floored at 0)
  const netBeforeFloor = grossNeeds - totalDeductions;
  const totalInsuranceNeeds = Math.max(0, netBeforeFloor);

  const result: InsuranceNeedsResult = {
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

  return {
    result,
    intermediates: {
      spouseIncomeRaw,
      validClientIncome,
      validSpouseIncome,
      includedSpouseIncome,
      validPercent,
      validYears,
      replacementFactor,
      totalIncomeForReplacement,
      validDebtTotal,
      validTotalAssets,
      validExistingCoverage,
      validLiquidAssets,
      totalDeductions,
      netBeforeFloor,
      estateBufferConfiguredValue,
      normalizedEstateBufferValue,
    },
  };
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
  return calculateInsuranceNeedsCore(input).result;
}

export function calculateInsuranceNeedsWithTrace(
  input: InsuranceNeedsInput,
): InsuranceNeedsCalculationWithTraceResult {
  const { result, intermediates } = calculateInsuranceNeedsCore(input);

  return {
    result,
    trace: buildInsuranceNeedsTrace(input, result, intermediates),
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
  return calculateInsuranceNeedsRoundedWithTrace(input).result;
}

export function calculateInsuranceNeedsRoundedWithTrace(
  input: InsuranceNeedsInput,
): InsuranceNeedsCalculationWithTraceResult {
  const { result: unrounded, intermediates } =
    calculateInsuranceNeedsCore(input);
  const totalInsuranceNeeds = roundCurrency(unrounded.totalInsuranceNeeds);

  const result: InsuranceNeedsResult = {
    incomeReplacementNeeds: roundCurrency(unrounded.incomeReplacementNeeds),
    debtPayoffNeeds: roundCurrency(unrounded.debtPayoffNeeds),
    estateBufferNeeds: roundCurrency(unrounded.estateBufferNeeds),
    grossNeeds: roundCurrency(unrounded.grossNeeds),
    existingCoverage: roundCurrency(unrounded.existingCoverage),
    liquidAssets: roundCurrency(unrounded.liquidAssets),
    totalInsuranceNeeds,
    totalInsuranceNeedsBand: deriveRecommendationBand(totalInsuranceNeeds),
    inputsUsed: unrounded.inputsUsed,
  };

  return {
    result,
    trace: buildInsuranceNeedsTrace(input, result, intermediates, {
      rounded: true,
    }),
  };
}
