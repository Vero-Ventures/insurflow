/**
 * Actuarial Pricing Engine
 *
 * Calculates insurance premiums using actuarial principles:
 * - Mortality-based cost of insurance
 * - Present value of death benefits
 * - Premium loading factors (expenses, profit margins, reserves)
 *
 * Supports term life, whole life, and universal life products.
 * All functions are pure and side-effect free for easy testing.
 */

import {
  type RiskProfile,
  type HealthClass,
  type Sex,
  getMortalityProbability,
  getSurvivalProbability,
  getLifeExpectancy,
  toSmokingStatus,
  LIFE_EXPECTANCY_CAP,
} from "./mortality-tables";
import {
  DEFAULT_TERM_LIFE_YEARS,
  MAX_TERM_LIFE_YEARS,
  DEFAULT_ACTUARIAL_DISCOUNT_RATE,
  MIN_INSURABLE_AGE,
  MAX_INSURABLE_AGE,
} from "@/lib/constants";

// Re-export for convenience of consumers (with original names for backward compatibility)
export const DEFAULT_TERM_YEARS = DEFAULT_TERM_LIFE_YEARS;
export const MAX_TERM_YEARS = MAX_TERM_LIFE_YEARS;
export const ACTUARIAL_DISCOUNT_RATE = DEFAULT_ACTUARIAL_DISCOUNT_RATE;

// ============================================================================
// Types
// ============================================================================

/** Life insurance product types */
export type ProductType =
  | "term_life"
  | "whole_life"
  | "universal_life"
  | "variable_life";

/** Payment frequency */
export type PaymentFrequency =
  | "annual"
  | "semi_annual"
  | "quarterly"
  | "monthly";

/** Premium calculation input */
export interface PremiumInput {
  /** Product type */
  productType: ProductType;
  /** Face amount (death benefit) in dollars */
  faceAmount: number;
  /** Insured's current age */
  age: number;
  /** Biological sex */
  sex: Sex;
  /** Smoking status */
  isSmoker: boolean;
  /** Underwriting health classification */
  healthClass: HealthClass;
  /** Policy term in years (required for term life) */
  termYears?: number;
  /** Payment frequency (default: annual) */
  paymentFrequency?: PaymentFrequency;
}

/** Premium calculation result */
export interface PremiumResult {
  /** Annual premium in dollars */
  annualPremium: number;
  /** Monthly premium in dollars */
  monthlyPremium: number;
  /** Premium per payment period */
  periodPremium: number;
  /** Payment frequency used */
  paymentFrequency: PaymentFrequency;
  /** Cost of insurance component (mortality cost) */
  costOfInsurance: number;
  /** Loading factor applied (expenses + profit) */
  loadingFactor: number;
  /** Present value of death benefit */
  pvDeathBenefit: number;
  /** Risk profile used for calculation */
  riskProfile: RiskProfile;
  /** Inputs used for audit trail */
  inputsUsed: {
    productType: ProductType;
    faceAmount: number;
    age: number;
    sex: Sex;
    isSmoker: boolean;
    healthClass: HealthClass;
    termYears: number | null;
  };
  /** Calculation metadata */
  metadata: PremiumMetadata;
}

/** Premium calculation metadata */
export interface PremiumMetadata {
  /** Description of calculation method */
  description: string;
  /** Key assumptions used */
  assumptions: string[];
  /** Warnings or notes */
  warnings: string[];
}

/** Quote comparison for multiple products */
export interface ProductQuote {
  productType: ProductType;
  productName: string;
  annualPremium: number;
  monthlyPremium: number;
  termYears: number | null;
  faceAmount: number;
  /** Total premium over policy term (or to age 100 for permanent) */
  totalPremiumCost: number;
  /** Cost per $1,000 of coverage */
  costPerThousand: number;
  /** Product features */
  features: string[];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Premium loading factors by product type.
 * These account for insurer expenses, profit margin, and reserves.
 */
export const LOADING_FACTORS: Record<ProductType, number> = {
  term_life: 1.25, // 25% loading (simple product, low admin)
  whole_life: 1.45, // 45% loading (cash value, higher admin)
  universal_life: 1.4, // 40% loading (flexible, moderate admin)
  variable_life: 1.5, // 50% loading (investment component, high admin)
};

/**
 * Payment frequency factors (modal factors).
 * Account for timing and administrative costs of more frequent payments.
 */
export const FREQUENCY_FACTORS: Record<PaymentFrequency, number> = {
  annual: 1.0,
  semi_annual: 0.51, // Slight premium for semi-annual
  quarterly: 0.26, // Slight premium for quarterly
  monthly: 0.0875, // Slight premium for monthly
};

/** Number of payments per year by frequency */
export const PAYMENTS_PER_YEAR: Record<PaymentFrequency, number> = {
  annual: 1,
  semi_annual: 2,
  quarterly: 4,
  monthly: 12,
};

/** Product display names */
export const PRODUCT_NAMES: Record<ProductType, string> = {
  term_life: "Term Life Insurance",
  whole_life: "Whole Life Insurance",
  universal_life: "Universal Life Insurance",
  variable_life: "Variable Life Insurance",
};

/** Product features for comparison */
export const PRODUCT_FEATURES: Record<ProductType, string[]> = {
  term_life: [
    "Coverage for specific term",
    "Lowest premium cost",
    "No cash value",
    "Convertible to permanent (typically)",
  ],
  whole_life: [
    "Lifetime coverage",
    "Guaranteed cash value growth",
    "Fixed premiums",
    "Dividend potential (participating policies)",
  ],
  universal_life: [
    "Lifetime coverage",
    "Flexible premiums",
    "Adjustable death benefit",
    "Cash value with interest crediting",
  ],
  variable_life: [
    "Lifetime coverage",
    "Investment sub-accounts",
    "Market-linked cash value",
    "Higher risk/reward potential",
  ],
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Round to 2 decimal places (currency precision).
 */
function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Clamp a value to a range.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Build risk profile from input parameters.
 */
function buildRiskProfile(input: PremiumInput): RiskProfile {
  return {
    age: clamp(Math.floor(input.age), MIN_INSURABLE_AGE, MAX_INSURABLE_AGE),
    sex: input.sex,
    smokingStatus: toSmokingStatus(input.isSmoker),
    healthClass: input.healthClass,
  };
}

// ============================================================================
// Core Pricing Functions
// ============================================================================

/**
 * Calculate the actuarial present value (APV) of a term life insurance policy.
 * Uses the equivalence principle: PV(premiums) = PV(benefits) + PV(expenses)
 *
 * @param profile - Risk profile of insured
 * @param faceAmount - Death benefit amount
 * @param termYears - Policy term in years
 * @param discountRate - Interest rate for discounting
 * @returns Annual level premium (before loading)
 */
function calculateTermLifeAPV(
  profile: RiskProfile,
  faceAmount: number,
  termYears: number,
  discountRate: number,
): { annualPremium: number; pvDeathBenefit: number; costOfInsurance: number } {
  let pvDeathBenefit = 0;
  let pvAnnuityFactor = 0;
  let cumulativeSurvival = 1;

  for (let t = 0; t < termYears; t++) {
    const currentAge = Math.min(profile.age + t, MAX_INSURABLE_AGE);
    const yearProfile: RiskProfile = { ...profile, age: currentAge };

    const qx = getMortalityProbability(yearProfile);
    const px = getSurvivalProbability(yearProfile);
    const discount = Math.pow(1 + discountRate, -(t + 1));

    // PV of death benefit if death occurs in year t+1
    pvDeathBenefit += cumulativeSurvival * qx * faceAmount * discount;

    // PV of $1 annuity (premium payment) if alive at start of year t
    if (t === 0) {
      pvAnnuityFactor += 1; // First premium at policy inception
    } else {
      const annuityDiscount = Math.pow(1 + discountRate, -t);
      pvAnnuityFactor += cumulativeSurvival * annuityDiscount;
    }

    cumulativeSurvival *= px;
  }

  // Net annual premium = APV of benefits / APV of annuity
  const netPremium = pvAnnuityFactor > 0 ? pvDeathBenefit / pvAnnuityFactor : 0;

  return {
    annualPremium: roundCurrency(netPremium),
    pvDeathBenefit: roundCurrency(pvDeathBenefit),
    costOfInsurance: roundCurrency(pvDeathBenefit),
  };
}

/**
 * Calculate the actuarial present value of a whole life insurance policy.
 * Assumes coverage to age 100 (life expectancy cap).
 *
 * @param profile - Risk profile of insured
 * @param faceAmount - Death benefit amount
 * @param discountRate - Interest rate for discounting
 * @returns Annual level premium (before loading)
 */
function calculateWholeLifeAPV(
  profile: RiskProfile,
  faceAmount: number,
  discountRate: number,
): { annualPremium: number; pvDeathBenefit: number; costOfInsurance: number } {
  const yearsToEndowment = LIFE_EXPECTANCY_CAP - profile.age;

  let pvDeathBenefit = 0;
  let pvAnnuityFactor = 0;
  let cumulativeSurvival = 1;

  for (let t = 0; t < yearsToEndowment; t++) {
    const currentAge = Math.min(profile.age + t, MAX_INSURABLE_AGE);
    const yearProfile: RiskProfile = { ...profile, age: currentAge };

    const qx = getMortalityProbability(yearProfile);
    const px = getSurvivalProbability(yearProfile);
    const discount = Math.pow(1 + discountRate, -(t + 1));

    // PV of death benefit
    pvDeathBenefit += cumulativeSurvival * qx * faceAmount * discount;

    // PV of annuity factor (premium payments)
    if (t === 0) {
      pvAnnuityFactor += 1;
    } else {
      const annuityDiscount = Math.pow(1 + discountRate, -t);
      pvAnnuityFactor += cumulativeSurvival * annuityDiscount;
    }

    cumulativeSurvival *= px;
  }

  // Add endowment value (if survive to age 100, receive face amount)
  const endowmentPV =
    cumulativeSurvival *
    faceAmount *
    Math.pow(1 + discountRate, -yearsToEndowment);
  pvDeathBenefit += endowmentPV;

  const netPremium = pvAnnuityFactor > 0 ? pvDeathBenefit / pvAnnuityFactor : 0;

  return {
    annualPremium: roundCurrency(netPremium),
    pvDeathBenefit: roundCurrency(pvDeathBenefit),
    costOfInsurance: roundCurrency(pvDeathBenefit - endowmentPV),
  };
}

/**
 * Calculate premium for universal life (uses whole life as base with adjustment).
 * Universal life has similar mortality costs but different product structure.
 */
function calculateUniversalLifeAPV(
  profile: RiskProfile,
  faceAmount: number,
  discountRate: number,
): { annualPremium: number; pvDeathBenefit: number; costOfInsurance: number } {
  // Universal life uses similar base calculation to whole life
  // but typically has lower base premium with flexible funding
  const wholeLifeResult = calculateWholeLifeAPV(
    profile,
    faceAmount,
    discountRate,
  );

  // UL typically prices at 90-95% of whole life due to lower guarantees
  const ulAdjustment = 0.92;

  return {
    annualPremium: roundCurrency(wholeLifeResult.annualPremium * ulAdjustment),
    pvDeathBenefit: roundCurrency(wholeLifeResult.pvDeathBenefit),
    costOfInsurance: roundCurrency(
      wholeLifeResult.costOfInsurance * ulAdjustment,
    ),
  };
}

// ============================================================================
// Main API Functions
// ============================================================================

/**
 * Calculate insurance premium for a given product and risk profile.
 *
 * @param input - Premium calculation parameters
 * @returns Premium result with annual/monthly amounts and metadata
 */
export function calculatePremium(input: PremiumInput): PremiumResult {
  // Validate and normalize inputs
  const faceAmount = Math.max(0, input.faceAmount);
  const termYears = clamp(
    input.termYears ?? DEFAULT_TERM_YEARS,
    1,
    MAX_TERM_YEARS,
  );
  const paymentFrequency = input.paymentFrequency ?? "annual";
  const profile = buildRiskProfile(input);

  // Calculate base premium based on product type
  let baseResult: {
    annualPremium: number;
    pvDeathBenefit: number;
    costOfInsurance: number;
  };
  let effectiveTermYears: number | null = null;

  switch (input.productType) {
    case "term_life":
      baseResult = calculateTermLifeAPV(
        profile,
        faceAmount,
        termYears,
        ACTUARIAL_DISCOUNT_RATE,
      );
      effectiveTermYears = termYears;
      break;

    case "whole_life":
      baseResult = calculateWholeLifeAPV(
        profile,
        faceAmount,
        ACTUARIAL_DISCOUNT_RATE,
      );
      break;

    case "universal_life":
      baseResult = calculateUniversalLifeAPV(
        profile,
        faceAmount,
        ACTUARIAL_DISCOUNT_RATE,
      );
      break;

    case "variable_life":
      // Variable life uses whole life base with higher loading
      baseResult = calculateWholeLifeAPV(
        profile,
        faceAmount,
        ACTUARIAL_DISCOUNT_RATE,
      );
      break;

    default: {
      const exhaustiveCheck: never = input.productType;
      throw new Error(`Unknown product type: ${exhaustiveCheck}`);
    }
  }

  // Apply loading factor
  const loadingFactor = LOADING_FACTORS[input.productType];
  const grossAnnualPremium = roundCurrency(
    baseResult.annualPremium * loadingFactor,
  );

  // Calculate monthly premium using modal loading factor
  // Monthly payments include administrative costs and lost interest
  const monthlyPremium = roundCurrency(
    grossAnnualPremium * FREQUENCY_FACTORS.monthly,
  );

  // Calculate period premium with frequency factor
  const frequencyFactor = FREQUENCY_FACTORS[paymentFrequency];
  const periodPremium = roundCurrency(grossAnnualPremium * frequencyFactor);

  // Build metadata
  const warnings: string[] = [];
  if (profile.age >= 70) {
    warnings.push("Premium rates are significantly higher for ages 70+");
  }
  if (input.isSmoker) {
    warnings.push("Smoker rates applied (approximately 2x non-smoker rates)");
  }
  if (input.healthClass === "substandard") {
    warnings.push("Substandard health rating increases premium by ~50%");
  }

  const lifeExpectancy = getLifeExpectancy(profile);

  return {
    annualPremium: grossAnnualPremium,
    monthlyPremium,
    periodPremium,
    paymentFrequency,
    costOfInsurance: baseResult.costOfInsurance,
    loadingFactor,
    pvDeathBenefit: baseResult.pvDeathBenefit,
    riskProfile: profile,
    inputsUsed: {
      productType: input.productType,
      faceAmount,
      age: profile.age,
      sex: input.sex,
      isSmoker: input.isSmoker,
      healthClass: input.healthClass,
      termYears: effectiveTermYears,
    },
    metadata: {
      description: `${PRODUCT_NAMES[input.productType]} premium calculated using 2017 CSO mortality tables`,
      assumptions: [
        `Face amount: $${faceAmount.toLocaleString()}`,
        `Issue age: ${profile.age}`,
        `Sex: ${profile.sex === "M" ? "Male" : "Female"}`,
        `Smoking status: ${input.isSmoker ? "Smoker" : "Non-smoker"}`,
        `Health class: ${input.healthClass.replace("_", " ")}`,
        `Discount rate: ${(ACTUARIAL_DISCOUNT_RATE * 100).toFixed(1)}%`,
        `Loading factor: ${((loadingFactor - 1) * 100).toFixed(0)}%`,
        `Life expectancy: ${lifeExpectancy} years`,
        ...(effectiveTermYears
          ? [`Policy term: ${effectiveTermYears} years`]
          : []),
      ],
      warnings,
    },
  };
}

/**
 * Generate quotes for multiple products for comparison.
 *
 * @param input - Base input (product type will be overridden)
 * @param productTypes - Products to quote (defaults to all)
 * @returns Array of product quotes sorted by annual premium
 */
export function generateProductQuotes(
  input: Omit<PremiumInput, "productType">,
  productTypes: ProductType[] = [
    "term_life",
    "whole_life",
    "universal_life",
    "variable_life",
  ],
): ProductQuote[] {
  const quotes: ProductQuote[] = [];
  const profile = buildRiskProfile({ ...input, productType: "term_life" });
  const yearsToAge100 = LIFE_EXPECTANCY_CAP - profile.age;

  for (const productType of productTypes) {
    const result = calculatePremium({ ...input, productType });

    // Calculate total cost over policy lifetime
    let totalPremiumCost: number;
    let termYears: number | null = null;

    if (productType === "term_life") {
      termYears = input.termYears ?? DEFAULT_TERM_YEARS;
      totalPremiumCost = result.annualPremium * termYears;
    } else {
      // Permanent policies: calculate to age 100
      totalPremiumCost = result.annualPremium * yearsToAge100;
    }

    quotes.push({
      productType,
      productName: PRODUCT_NAMES[productType],
      annualPremium: result.annualPremium,
      monthlyPremium: result.monthlyPremium,
      termYears,
      faceAmount: input.faceAmount,
      totalPremiumCost: roundCurrency(totalPremiumCost),
      costPerThousand: roundCurrency(
        input.faceAmount > 0
          ? result.annualPremium / (input.faceAmount / 1000)
          : 0,
      ),
      features: PRODUCT_FEATURES[productType],
    });
  }

  // Sort by annual premium (lowest first)
  return quotes.sort((a, b) => a.annualPremium - b.annualPremium);
}

/**
 * Calculate the face amount affordable for a given premium budget.
 *
 * @param maxAnnualPremium - Maximum annual premium budget
 * @param input - Premium input (faceAmount will be calculated)
 * @returns Maximum affordable face amount
 */
export function calculateAffordableFaceAmount(
  maxAnnualPremium: number,
  input: Omit<PremiumInput, "faceAmount">,
): number {
  // Use binary search to find the face amount that produces the target premium
  let low = 10_000;
  let high = 50_000_000;
  let result = low;

  const maxIterations = 50;
  for (let i = 0; i < maxIterations; i++) {
    const mid = Math.floor((low + high) / 2);
    const premium = calculatePremium({ ...input, faceAmount: mid });

    if (premium.annualPremium <= maxAnnualPremium) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }

    if (low > high) break;
  }

  // Round to nearest $10,000 for cleaner amounts
  return Math.floor(result / 10_000) * 10_000;
}

/**
 * Estimate premium for quick quotes without full calculation.
 * Uses simplified mortality-based calculation.
 *
 * @param faceAmount - Death benefit
 * @param age - Issue age
 * @param sex - Biological sex
 * @param isSmoker - Smoking status
 * @param productType - Product type
 * @returns Estimated annual premium
 */
export function estimatePremium(
  faceAmount: number,
  age: number,
  sex: Sex,
  isSmoker: boolean,
  productType: ProductType = "term_life",
): number {
  // Simplified estimation using standard health class
  const result = calculatePremium({
    productType,
    faceAmount,
    age,
    sex,
    isSmoker,
    healthClass: "standard",
    termYears: productType === "term_life" ? 20 : undefined,
  });

  return result.annualPremium;
}
