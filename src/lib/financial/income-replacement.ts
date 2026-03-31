/**
 * Advanced Income Replacement Calculator
 *
 * Computes the present value (PV) of a future income-replacement stream,
 * adjusted for inflation, and nets off survivor resources.
 *
 * This is the "Phase 2" calculator that accounts for the time-value of money,
 * whereas the basic calculator in insurance-needs.ts uses a simple
 * income × replacementRatio × years multiplier.
 *
 * Supports two calculation modes:
 *   1. **Income-Multiplier Mode** (default): Uses a percentage of gross income
 *      (e.g., 70% of $100K = $70K/year need). Simple and traditional.
 *   2. **Expense-Based Mode**: Uses actual household expenses as the baseline,
 *      then adjusts for post-death expense reduction (e.g., one fewer person).
 *      More realistic for families with detailed expense data.
 *
 * All functions are pure and side-effect free.
 *
 * Key formulae (Income-Multiplier Mode):
 *   incomeNeed(N) = baseAnnualIncome × replacementRatio × (1 + inflationRate)^N
 *   PV            = Σ  incomeNeed(N) / (1 + discountRate)^N   for N = 1..duration
 *   netCoverage   = max(0, PV(incomeNeeds) − PV(survivorResources))
 *
 * Key formulae (Expense-Based Mode):
 *   adjustedExpense = annualExpenses × (1 − expenseReductionPercent)
 *   expenseNeed(N) = adjustedExpense × (1 + inflationRate)^N
 *   PV             = Σ  expenseNeed(N) / (1 + discountRate)^N
 *   netCoverage    = max(0, PV(expenseNeeds) − PV(survivorResources))
 *
 * Terminology:
 *   - "survivor resources" is the umbrella term for government survivor
 *     benefits, existing insurance, investment income, and other income.
 *     The name is intentionally region-agnostic (not "CPP" or "Social Security").
 */

import {
  DEFAULT_DISCOUNT_RATE,
  DEFAULT_INFLATION_RATE,
  DEFAULT_EXPENSE_REDUCTION_PERCENT,
} from "@/lib/constants";
import { roundCurrency } from "@/lib/financial/utils";

// ============================================================================
// Constants
// ============================================================================

/** Maximum horizon for the "lifetime" scenario (age cap) */
export const LIFETIME_AGE_CAP = 95;

/** Minimum allowed duration */
export const MIN_DURATION_YEARS = 0;

/** Maximum allowed duration to guard against absurd inputs */
export const MAX_DURATION_YEARS = 80;

// ============================================================================
// Calculation Mode Types
// ============================================================================

/**
 * Calculation mode determines how the baseline income need is computed.
 *
 * - `income-multiplier`: Traditional approach using a percentage of gross income.
 *   Simple, widely understood, but may over/underestimate actual survivor needs.
 *
 * - `expense-based`: Uses actual household expenses, adjusted for post-death
 *   expense reduction. More realistic when expense data is available.
 */
export type CalculationMode = "income-multiplier" | "expense-based";

/**
 * Assumptions metadata for transparency and audit trail.
 * Exposes which mode was used and the key assumptions applied.
 */
export interface CalculationAssumptions {
  /** The calculation mode used */
  mode: CalculationMode;
  /** Human-readable description of the mode */
  modeDescription: string;
  /** Key assumptions that went into the calculation */
  assumptions: string[];
}

// ============================================================================
// Types
// ============================================================================

/**
 * Duration scenario selector.
 *
 * - `childTurns18`: income replacement until the youngest child turns 18.
 * - `retirement`:   income replacement until the client reaches retirement age.
 * - `lifetime`:     income replacement until LIFETIME_AGE_CAP (default 95).
 * - `custom`:       explicit number of years provided by the user.
 */
export type DurationScenario =
  | { type: "childTurns18"; youngestChildAge: number }
  | { type: "retirement"; currentAge: number; retirementAge: number }
  | { type: "lifetime"; currentAge: number }
  | { type: "custom"; years: number };

/** Annual survivor resources that offset the income need. */
export interface SurvivorResources {
  /** Annual government survivor benefit (e.g., Social Security, CPP, etc.) */
  govSurvivorBenefit: number;
  /** Lump-sum existing life insurance (PV'd as a year-1 offset) */
  existingInsurance: number;
  /** Annual investment income available to the survivor */
  investmentIncome: number;
  /** Annual other income (rental, pension, etc.) */
  otherIncome: number;
}

/**
 * Income-multiplier mode configuration.
 * Uses a percentage of gross income as the baseline need.
 */
export interface IncomeMultiplierConfig {
  mode: "income-multiplier";
  /** Gross annual income to be replaced */
  baseAnnualIncome: number;
  /** Fraction of income to replace (0–1, e.g. 0.70 for 70%) */
  replacementRatio: number;
}

/**
 * Expense-based mode configuration.
 * Uses actual household expenses as the baseline, adjusted for post-death reduction.
 */
export interface ExpenseBasedConfig {
  mode: "expense-based";
  /** Total annual household expenses (housing, food, utilities, etc.) */
  annualExpenses: number;
  /**
   * Percentage by which expenses decrease after the primary earner's death (0–1).
   * Typically 15-25% (one fewer person = less food, transport, etc.).
   * Defaults to DEFAULT_EXPENSE_REDUCTION_PERCENT if omitted.
   */
  expenseReductionPercent?: number;
}

/**
 * Mode-specific configuration for the calculation.
 * Either income-multiplier or expense-based.
 */
export type ModeConfig = IncomeMultiplierConfig | ExpenseBasedConfig;

/** Inputs to the advanced income replacement calculator. */
export interface IncomeReplacementInput {
  /** Gross annual income to be replaced */
  baseAnnualIncome: number;
  /** Fraction of income to replace (0–1, e.g. 0.70 for 70%) */
  replacementRatio: number;
  /** Annual inflation rate (e.g. 0.02 for 2%) */
  inflationRate?: number;
  /** Annual discount rate for present-value (e.g. 0.05 for 5%) */
  discountRate?: number;
  /** How long to provide replacement income */
  duration: DurationScenario;
  /** Resources that reduce the net coverage gap */
  survivorResources?: SurvivorResources;
}

/**
 * Extended input that supports both income-multiplier and expense-based modes.
 * Backward compatible: if `modeConfig` is omitted, falls back to income-multiplier
 * using `baseAnnualIncome` and `replacementRatio` from the legacy fields.
 */
export interface IncomeReplacementInputV2 {
  /**
   * Mode-specific configuration. If omitted, uses income-multiplier mode
   * with `baseAnnualIncome` and `replacementRatio` (legacy behavior).
   */
  modeConfig?: ModeConfig;
  /** @deprecated Use modeConfig.baseAnnualIncome instead. Kept for backward compatibility. */
  baseAnnualIncome?: number;
  /** @deprecated Use modeConfig.replacementRatio instead. Kept for backward compatibility. */
  replacementRatio?: number;
  /** Annual inflation rate (e.g. 0.02 for 2%) */
  inflationRate?: number;
  /** Annual discount rate for present-value (e.g. 0.05 for 5%) */
  discountRate?: number;
  /** How long to provide replacement income */
  duration: DurationScenario;
  /** Resources that reduce the net coverage gap */
  survivorResources?: SurvivorResources;
}

/** One row in the year-by-year schedule. */
export interface AnnualScheduleEntry {
  /** Year number (1-indexed) */
  year: number;
  /** Nominal income need for this year (inflation-adjusted) */
  incomeNeed: number;
  /** Nominal survivor resources for this year (inflation-adjusted) */
  survivorOffset: number;
  /** Net need for this year (incomeNeed − survivorOffset, floored at 0) */
  netNeed: number;
  /** Present value of the net need */
  netNeedPV: number;
}

/** Full result from the advanced income replacement calculator. */
export interface IncomeReplacementResult {
  /** Duration used (resolved from scenario) */
  durationYears: number;
  /** Year-by-year schedule */
  annualSchedule: AnnualScheduleEntry[];
  /** PV of gross income replacement needs */
  presentValueTotal: number;
  /** PV of total survivor resources */
  survivorResourcesPV: number;
  /** Net coverage gap = max(0, presentValueTotal − survivorResourcesPV) */
  netCoverageNeededPV: number;
  /** Metadata about the calculation mode and assumptions used */
  calculationMetadata: CalculationAssumptions;
  /** Debug: the inputs after defaults/clamping were applied */
  resolvedInputs: {
    baseAnnualIncome: number;
    replacementRatio: number;
    inflationRate: number;
    discountRate: number;
    durationYears: number;
    survivorResources: SurvivorResources;
  };
}

/**
 * Extended result for V2 calculations that includes mode-specific resolved inputs.
 */
export interface IncomeReplacementResultV2 {
  /** Duration used (resolved from scenario) */
  durationYears: number;
  /** Year-by-year schedule */
  annualSchedule: AnnualScheduleEntry[];
  /** PV of gross income replacement needs */
  presentValueTotal: number;
  /** PV of total survivor resources */
  survivorResourcesPV: number;
  /** Net coverage gap = max(0, presentValueTotal − survivorResourcesPV) */
  netCoverageNeededPV: number;
  /** Metadata about the calculation mode and assumptions used */
  calculationMetadata: CalculationAssumptions;
  /** Debug: the inputs after defaults/clamping were applied (V2 format) */
  resolvedInputs: ResolvedInputsV2;
}

/**
 * Resolved inputs for V2 calculations, supporting both modes.
 */
export interface ResolvedInputsV2 {
  /** The calculation mode used */
  mode: CalculationMode;
  /** Annual baseline need (either from income-multiplier or expense-based) */
  annualBaselineNeed: number;
  /** For income-multiplier: the base annual income used */
  baseAnnualIncome?: number;
  /** For income-multiplier: the replacement ratio used */
  replacementRatio?: number;
  /** For expense-based: the annual expenses used */
  annualExpenses?: number;
  /** For expense-based: the expense reduction percent applied */
  expenseReductionPercent?: number;
  /** Annual inflation rate applied */
  inflationRate: number;
  /** Annual discount rate applied */
  discountRate: number;
  /** Duration in years */
  durationYears: number;
  /** Survivor resources applied */
  survivorResources: SurvivorResources;
}

// ============================================================================
// Duration resolution
// ============================================================================

/**
 * Resolve a DurationScenario to a concrete number of years.
 * Result is clamped to [MIN_DURATION_YEARS, MAX_DURATION_YEARS].
 */
export function resolveDuration(scenario: DurationScenario): number {
  let years: number;

  switch (scenario.type) {
    case "childTurns18": {
      const age = Math.max(0, Math.floor(scenario.youngestChildAge));
      years = Math.max(0, 18 - age);
      break;
    }
    case "retirement": {
      const current = Math.max(0, Math.floor(scenario.currentAge));
      const retirement = Math.max(0, Math.floor(scenario.retirementAge));
      years = Math.max(0, retirement - current);
      break;
    }
    case "lifetime": {
      const current = Math.max(0, Math.floor(scenario.currentAge));
      years = Math.max(0, LIFETIME_AGE_CAP - current);
      break;
    }
    case "custom": {
      years = Math.max(0, Math.floor(scenario.years));
      break;
    }
  }

  return Math.min(Math.max(years, MIN_DURATION_YEARS), MAX_DURATION_YEARS);
}

// ============================================================================
// Core calculation
// ============================================================================

/** Clamp a value to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Default survivor resources (all zeros). */
const EMPTY_SURVIVOR_RESOURCES: SurvivorResources = {
  govSurvivorBenefit: 0,
  existingInsurance: 0,
  investmentIncome: 0,
  otherIncome: 0,
};

interface IncomeReplacementProjectionInput {
  annualBaselineNeed: number;
  inflationRate: number;
  discountRate: number;
  durationYears: number;
  survivorResources: SurvivorResources;
}

interface IncomeReplacementProjectionResult {
  annualSchedule: AnnualScheduleEntry[];
  presentValueTotal: number;
  survivorResourcesPV: number;
  netCoverageNeededPV: number;
}

function normalizeSurvivorResources(
  survivorResources?: SurvivorResources,
): SurvivorResources {
  return {
    govSurvivorBenefit: Math.max(
      0,
      survivorResources?.govSurvivorBenefit ??
        EMPTY_SURVIVOR_RESOURCES.govSurvivorBenefit,
    ),
    existingInsurance: Math.max(
      0,
      survivorResources?.existingInsurance ??
        EMPTY_SURVIVOR_RESOURCES.existingInsurance,
    ),
    investmentIncome: Math.max(
      0,
      survivorResources?.investmentIncome ??
        EMPTY_SURVIVOR_RESOURCES.investmentIncome,
    ),
    otherIncome: Math.max(
      0,
      survivorResources?.otherIncome ?? EMPTY_SURVIVOR_RESOURCES.otherIncome,
    ),
  };
}

function calculateIncomeReplacementProjection({
  annualBaselineNeed,
  inflationRate,
  discountRate,
  durationYears,
  survivorResources,
}: IncomeReplacementProjectionInput): IncomeReplacementProjectionResult {
  if (durationYears <= 0) {
    return {
      annualSchedule: [],
      presentValueTotal: 0,
      survivorResourcesPV: 0,
      netCoverageNeededPV: 0,
    };
  }

  const annualSchedule: AnnualScheduleEntry[] = [];
  let presentValueTotal = 0;
  let survivorResourcesPV = 0;

  const annualSurvivorBase =
    survivorResources.govSurvivorBenefit +
    survivorResources.investmentIncome +
    survivorResources.otherIncome;

  survivorResourcesPV += survivorResources.existingInsurance;

  for (let n = 1; n <= durationYears; n++) {
    const inflationFactor = Math.pow(1 + inflationRate, n);
    const incomeNeed = annualBaselineNeed * inflationFactor;

    const annualSurvivorInflated = annualSurvivorBase * inflationFactor;
    const lumpSumOffset = n === 1 ? survivorResources.existingInsurance : 0;
    const survivorOffset = annualSurvivorInflated + lumpSumOffset;

    const netNeed = Math.max(0, incomeNeed - survivorOffset);

    const discountFactor = Math.pow(1 + discountRate, n);
    const incomeNeedPV = incomeNeed / discountFactor;
    const annualSurvivorPV = annualSurvivorInflated / discountFactor;
    let netNeedPV = incomeNeedPV - annualSurvivorPV;
    if (n === 1) {
      netNeedPV -= survivorResources.existingInsurance;
    }
    netNeedPV = Math.max(0, netNeedPV);

    presentValueTotal += incomeNeedPV;
    survivorResourcesPV += annualSurvivorPV;

    annualSchedule.push({
      year: n,
      incomeNeed: roundCurrency(incomeNeed),
      survivorOffset: roundCurrency(survivorOffset),
      netNeed: roundCurrency(netNeed),
      netNeedPV: roundCurrency(netNeedPV),
    });
  }

  const netCoverageNeededPV = Math.max(
    0,
    presentValueTotal - survivorResourcesPV,
  );

  return {
    annualSchedule,
    presentValueTotal: roundCurrency(presentValueTotal),
    survivorResourcesPV: roundCurrency(survivorResourcesPV),
    netCoverageNeededPV: roundCurrency(netCoverageNeededPV),
  };
}

/**
 * Build calculation metadata for income-multiplier mode.
 */
function buildIncomeMultiplierMetadata(
  baseAnnualIncome: number,
  replacementRatio: number,
  inflationRate: number,
  discountRate: number,
): CalculationAssumptions {
  return {
    mode: "income-multiplier",
    modeDescription:
      "Income replacement calculated as a percentage of gross annual income",
    assumptions: [
      `Base annual income: $${baseAnnualIncome.toLocaleString()}`,
      `Replacement ratio: ${(replacementRatio * 100).toFixed(0)}% of income`,
      `Inflation rate: ${(inflationRate * 100).toFixed(1)}% annually`,
      `Discount rate: ${(discountRate * 100).toFixed(1)}% annually`,
      "Survivor resources are inflation-adjusted annually",
      "Existing insurance treated as lump-sum offset in year 1",
    ],
  };
}

/**
 * Build calculation metadata for expense-based mode.
 */
function buildExpenseBasedMetadata(
  annualExpenses: number,
  expenseReductionPercent: number,
  adjustedExpense: number,
  inflationRate: number,
  discountRate: number,
): CalculationAssumptions {
  return {
    mode: "expense-based",
    modeDescription:
      "Income replacement based on actual household expenses, adjusted for post-death reduction",
    assumptions: [
      `Annual household expenses: $${annualExpenses.toLocaleString()}`,
      `Post-death expense reduction: ${(expenseReductionPercent * 100).toFixed(0)}%`,
      `Adjusted annual need: $${adjustedExpense.toLocaleString()}`,
      `Inflation rate: ${(inflationRate * 100).toFixed(1)}% annually`,
      `Discount rate: ${(discountRate * 100).toFixed(1)}% annually`,
      "Expense reduction accounts for deceased's direct costs (food, transport, etc.)",
      "Survivor resources are inflation-adjusted annually",
      "Existing insurance treated as lump-sum offset in year 1",
    ],
  };
}

/**
 * Compute the advanced income replacement calculation.
 *
 * @returns Full result including the year-by-year schedule and PV totals.
 */
export function calculateAdvancedIncomeReplacement(
  input: IncomeReplacementInput,
): IncomeReplacementResult {
  const baseAnnualIncome = Math.max(0, input.baseAnnualIncome);
  const replacementRatio = clamp(input.replacementRatio, 0, 1);
  const inflationRate = clamp(
    input.inflationRate ?? DEFAULT_INFLATION_RATE,
    0,
    0.5,
  );
  const discountRate = clamp(
    input.discountRate ?? DEFAULT_DISCOUNT_RATE,
    0,
    0.5,
  );
  const durationYears = resolveDuration(input.duration);
  const survivorResources = normalizeSurvivorResources(input.survivorResources);
  const annualBaselineNeed = baseAnnualIncome * replacementRatio;

  const projection = calculateIncomeReplacementProjection({
    annualBaselineNeed,
    inflationRate,
    discountRate,
    durationYears,
    survivorResources,
  });

  return {
    durationYears,
    annualSchedule: projection.annualSchedule,
    presentValueTotal: projection.presentValueTotal,
    survivorResourcesPV: projection.survivorResourcesPV,
    netCoverageNeededPV: projection.netCoverageNeededPV,
    calculationMetadata: buildIncomeMultiplierMetadata(
      baseAnnualIncome,
      replacementRatio,
      inflationRate,
      discountRate,
    ),
    resolvedInputs: {
      baseAnnualIncome,
      replacementRatio,
      inflationRate,
      discountRate,
      durationYears,
      survivorResources,
    },
  };
}

// ============================================================================
// V2 Multi-Mode Calculation
// ============================================================================

/**
 * Compute the advanced income replacement calculation with support for both
 * income-multiplier and expense-based modes.
 *
 * This is the recommended function for new integrations. It provides explicit
 * mode selection and returns comprehensive metadata about the calculation.
 *
 * @param input - V2 input supporting both calculation modes
 * @returns Full result including the year-by-year schedule, PV totals, and mode metadata
 */
export function calculateIncomeReplacementV2(
  input: IncomeReplacementInputV2,
): IncomeReplacementResultV2 {
  const inflationRate = clamp(
    input.inflationRate ?? DEFAULT_INFLATION_RATE,
    0,
    0.5,
  );
  const discountRate = clamp(
    input.discountRate ?? DEFAULT_DISCOUNT_RATE,
    0,
    0.5,
  );
  const resolvedMode = resolveModeConfig(input, inflationRate, discountRate);
  const durationYears = resolveDuration(input.duration);
  const survivorResources = normalizeSurvivorResources(input.survivorResources);
  const projection = calculateIncomeReplacementProjection({
    annualBaselineNeed: resolvedMode.annualBaselineNeed,
    inflationRate,
    discountRate,
    durationYears,
    survivorResources,
  });

  return {
    durationYears,
    annualSchedule: projection.annualSchedule,
    presentValueTotal: projection.presentValueTotal,
    survivorResourcesPV: projection.survivorResourcesPV,
    netCoverageNeededPV: projection.netCoverageNeededPV,
    calculationMetadata: resolvedMode.metadata,
    resolvedInputs: {
      ...resolvedMode.resolvedInputs,
      inflationRate,
      discountRate,
      durationYears,
      survivorResources,
    },
  };
}

/**
 * Internal: Resolve mode configuration from V2 input.
 * Returns the annual baseline need and metadata for the selected mode.
 */
interface ResolvedModeConfig {
  annualBaselineNeed: number;
  metadata: CalculationAssumptions;
  resolvedInputs: Omit<
    ResolvedInputsV2,
    "inflationRate" | "discountRate" | "durationYears" | "survivorResources"
  >;
}

function resolveModeConfig(
  input: IncomeReplacementInputV2,
  inflationRate: number,
  discountRate: number,
): ResolvedModeConfig {
  // If modeConfig is provided, use it
  if (input.modeConfig) {
    if (input.modeConfig.mode === "expense-based") {
      const annualExpenses = Math.max(0, input.modeConfig.annualExpenses);
      const expenseReductionPercent = clamp(
        input.modeConfig.expenseReductionPercent ??
          DEFAULT_EXPENSE_REDUCTION_PERCENT,
        0,
        1,
      );
      const adjustedExpense = annualExpenses * (1 - expenseReductionPercent);

      return {
        annualBaselineNeed: adjustedExpense,
        metadata: buildExpenseBasedMetadata(
          annualExpenses,
          expenseReductionPercent,
          adjustedExpense,
          inflationRate,
          discountRate,
        ),
        resolvedInputs: {
          mode: "expense-based",
          annualBaselineNeed: adjustedExpense,
          annualExpenses,
          expenseReductionPercent,
        },
      };
    } else {
      // income-multiplier mode with explicit config
      const baseAnnualIncome = Math.max(0, input.modeConfig.baseAnnualIncome);
      const replacementRatio = clamp(input.modeConfig.replacementRatio, 0, 1);
      const annualBaselineNeed = baseAnnualIncome * replacementRatio;

      return {
        annualBaselineNeed,
        metadata: buildIncomeMultiplierMetadata(
          baseAnnualIncome,
          replacementRatio,
          inflationRate,
          discountRate,
        ),
        resolvedInputs: {
          mode: "income-multiplier",
          annualBaselineNeed,
          baseAnnualIncome,
          replacementRatio,
        },
      };
    }
  }

  // Legacy fallback: use baseAnnualIncome and replacementRatio fields
  const baseAnnualIncome = Math.max(0, input.baseAnnualIncome ?? 0);
  const replacementRatio = clamp(input.replacementRatio ?? 0.7, 0, 1);
  const annualBaselineNeed = baseAnnualIncome * replacementRatio;

  return {
    annualBaselineNeed,
    metadata: buildIncomeMultiplierMetadata(
      baseAnnualIncome,
      replacementRatio,
      inflationRate,
      discountRate,
    ),
    resolvedInputs: {
      mode: "income-multiplier",
      annualBaselineNeed,
      baseAnnualIncome,
      replacementRatio,
    },
  };
}

/**
 * Compare results from both calculation modes side-by-side.
 * Useful for advisors to show clients the difference between approaches.
 *
 * @param incomeInput - Income-multiplier mode configuration
 * @param expenseInput - Expense-based mode configuration
 * @param commonInput - Common parameters (duration, rates, survivor resources)
 * @returns Both results for comparison
 */
export function compareCalculationModes(
  incomeInput: {
    baseAnnualIncome: number;
    replacementRatio: number;
  },
  expenseInput: {
    annualExpenses: number;
    expenseReductionPercent?: number;
  },
  commonInput: {
    inflationRate?: number;
    discountRate?: number;
    duration: DurationScenario;
    survivorResources?: SurvivorResources;
  },
): {
  incomeMultiplierResult: IncomeReplacementResultV2;
  expenseBasedResult: IncomeReplacementResultV2;
  comparison: {
    netCoverageDifference: number;
    percentDifference: number;
    recommendation: string;
  };
} {
  const incomeMultiplierResult = calculateIncomeReplacementV2({
    modeConfig: {
      mode: "income-multiplier",
      baseAnnualIncome: incomeInput.baseAnnualIncome,
      replacementRatio: incomeInput.replacementRatio,
    },
    ...commonInput,
  });

  const expenseBasedResult = calculateIncomeReplacementV2({
    modeConfig: {
      mode: "expense-based",
      annualExpenses: expenseInput.annualExpenses,
      expenseReductionPercent: expenseInput.expenseReductionPercent,
    },
    ...commonInput,
  });

  const netCoverageDifference =
    incomeMultiplierResult.netCoverageNeededPV -
    expenseBasedResult.netCoverageNeededPV;

  // Calculate percent difference relative to the larger value
  const maxCoverage = Math.max(
    incomeMultiplierResult.netCoverageNeededPV,
    expenseBasedResult.netCoverageNeededPV,
  );
  const percentDifference =
    maxCoverage > 0 ? (Math.abs(netCoverageDifference) / maxCoverage) * 100 : 0;

  // Generate recommendation based on comparison
  let recommendation: string;
  if (percentDifference < 5) {
    recommendation =
      "Both methods produce similar results. Either approach is reasonable.";
  } else if (netCoverageDifference > 0) {
    recommendation =
      "Income-multiplier suggests higher coverage. Expense-based may be more accurate if household expense data is reliable.";
  } else {
    recommendation =
      "Expense-based suggests higher coverage. This may indicate lifestyle costs exceed typical income replacement ratios.";
  }

  return {
    incomeMultiplierResult,
    expenseBasedResult,
    comparison: {
      netCoverageDifference: roundCurrency(netCoverageDifference),
      percentDifference: roundCurrency(percentDifference),
      recommendation,
    },
  };
}
