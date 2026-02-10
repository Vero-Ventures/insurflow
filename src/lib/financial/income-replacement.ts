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
 * All functions are pure and side-effect free.
 *
 * Key formulae:
 *   incomeNeed(N) = baseAnnualIncome × replacementRatio × (1 + inflationRate)^N
 *   PV            = Σ  incomeNeed(N) / (1 + discountRate)^N   for N = 1..duration
 *   netCoverage   = max(0, PV(incomeNeeds) − PV(survivorResources))
 *
 * Terminology:
 *   - "survivor resources" is the umbrella term for government survivor
 *     benefits, existing insurance, investment income, and other income.
 *     The name is intentionally region-agnostic (not "CPP" or "Social Security").
 */

import { DEFAULT_DISCOUNT_RATE, DEFAULT_INFLATION_RATE } from "@/lib/constants";

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

/**
 * Compute the advanced income replacement calculation.
 *
 * @returns Full result including the year-by-year schedule and PV totals.
 */
export function calculateAdvancedIncomeReplacement(
  input: IncomeReplacementInput,
): IncomeReplacementResult {
  // --- Resolve & clamp inputs -----------------------------------------------
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

  const sr: SurvivorResources = {
    ...EMPTY_SURVIVOR_RESOURCES,
    ...input.survivorResources,
  };
  // Clamp survivor resources to non-negative
  sr.govSurvivorBenefit = Math.max(0, sr.govSurvivorBenefit);
  sr.existingInsurance = Math.max(0, sr.existingInsurance);
  sr.investmentIncome = Math.max(0, sr.investmentIncome);
  sr.otherIncome = Math.max(0, sr.otherIncome);

  // --- Edge case: zero duration ---------------------------------------------
  if (durationYears <= 0) {
    return {
      durationYears: 0,
      annualSchedule: [],
      presentValueTotal: 0,
      survivorResourcesPV: 0,
      netCoverageNeededPV: 0,
      resolvedInputs: {
        baseAnnualIncome,
        replacementRatio,
        inflationRate,
        discountRate,
        durationYears: 0,
        survivorResources: sr,
      },
    };
  }

  // --- Build year-by-year schedule ------------------------------------------
  const annualSchedule: AnnualScheduleEntry[] = [];
  let presentValueTotal = 0;
  let survivorResourcesPV = 0;

  // Annual recurring survivor resources (everything except lump-sum insurance)
  const annualSurvivorBase =
    sr.govSurvivorBenefit + sr.investmentIncome + sr.otherIncome;

  for (let n = 1; n <= durationYears; n++) {
    // Inflation-adjusted income need for year N
    const inflationFactor = Math.pow(1 + inflationRate, n);
    const incomeNeed = baseAnnualIncome * replacementRatio * inflationFactor;

    // Survivor offset for year N:
    //   - existing insurance: treated as a lump-sum offset in year 1 only
    //   - annual resources: inflation-adjusted the same way
    const annualSurvivorInflated = annualSurvivorBase * inflationFactor;
    const lumpSumOffset = n === 1 ? sr.existingInsurance : 0;
    const survivorOffset = annualSurvivorInflated + lumpSumOffset;

    // Net need for this year (floored at 0)
    const netNeed = Math.max(0, incomeNeed - survivorOffset);

    // Discount factor for year N
    const discountFactor = Math.pow(1 + discountRate, n);

    // Present values
    const incomeNeedPV = incomeNeed / discountFactor;
    const survivorOffsetPV = survivorOffset / discountFactor;
    const netNeedPV = netNeed / discountFactor;

    presentValueTotal += incomeNeedPV;
    survivorResourcesPV += survivorOffsetPV;

    annualSchedule.push({
      year: n,
      incomeNeed: roundToTwoDecimals(incomeNeed),
      survivorOffset: roundToTwoDecimals(survivorOffset),
      netNeed: roundToTwoDecimals(netNeed),
      netNeedPV: roundToTwoDecimals(netNeedPV),
    });
  }

  const netCoverageNeededPV = Math.max(
    0,
    presentValueTotal - survivorResourcesPV,
  );

  return {
    durationYears,
    annualSchedule,
    presentValueTotal: roundToTwoDecimals(presentValueTotal),
    survivorResourcesPV: roundToTwoDecimals(survivorResourcesPV),
    netCoverageNeededPV: roundToTwoDecimals(netCoverageNeededPV),
    resolvedInputs: {
      baseAnnualIncome,
      replacementRatio,
      inflationRate,
      discountRate,
      durationYears,
      survivorResources: sr,
    },
  };
}

// ============================================================================
// Helpers
// ============================================================================

/** Round to 2 decimal places (currency precision). */
function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}
