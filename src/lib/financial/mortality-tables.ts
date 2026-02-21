/**
 * Mortality Tables for Actuarial Pricing
 *
 * Based on 2017 CSO (Commissioners Standard Ordinary) mortality tables,
 * which are the industry standard for life insurance pricing in the US.
 *
 * All functions are pure and side-effect free for easy testing.
 */

// ============================================================================
// Types
// ============================================================================

/** Biological sex for mortality table lookup */
export type Sex = "M" | "F";

/** Underwriting health classification */
export type HealthClass =
  | "preferred_plus"
  | "preferred"
  | "standard_plus"
  | "standard"
  | "substandard";

/** Smoking status */
export type SmokingStatus = "nonsmoker" | "smoker";

/** Mortality rate lookup key */
export interface MortalityKey {
  age: number;
  sex: Sex;
  smokingStatus: SmokingStatus;
}

/** Full risk profile for premium calculation */
export interface RiskProfile {
  age: number;
  sex: Sex;
  smokingStatus: SmokingStatus;
  healthClass: HealthClass;
}

// ============================================================================
// Constants
// ============================================================================

/** Minimum insurable age */
export const MIN_INSURABLE_AGE = 18;

/** Maximum insurable age */
export const MAX_INSURABLE_AGE = 85;

/** Life expectancy cap for whole life calculations */
export const LIFE_EXPECTANCY_CAP = 100;

/**
 * Health class adjustment factors (multipliers applied to base mortality rate).
 * Lower factors = better health = lower premiums.
 */
export const HEALTH_CLASS_FACTORS: Record<HealthClass, number> = {
  preferred_plus: 0.6, // 40% reduction from standard
  preferred: 0.75, // 25% reduction from standard
  standard_plus: 0.9, // 10% reduction from standard
  standard: 1.0, // baseline
  substandard: 1.5, // 50% increase from standard
};

/**
 * 2017 CSO Base Mortality Rates (deaths per 1,000 lives per year)
 * Simplified table with key ages. Intermediate ages are linearly interpolated.
 *
 * Format: [age]: { M: { nonsmoker, smoker }, F: { nonsmoker, smoker } }
 */
const CSO_2017_MORTALITY_RATES: Record<
  number,
  Record<Sex, Record<SmokingStatus, number>>
> = {
  // Young adults (18-30)
  18: {
    M: { nonsmoker: 0.49, smoker: 0.98 },
    F: { nonsmoker: 0.28, smoker: 0.56 },
  },
  20: {
    M: { nonsmoker: 0.52, smoker: 1.04 },
    F: { nonsmoker: 0.3, smoker: 0.6 },
  },
  25: {
    M: { nonsmoker: 0.62, smoker: 1.24 },
    F: { nonsmoker: 0.35, smoker: 0.7 },
  },
  30: {
    M: { nonsmoker: 0.73, smoker: 1.46 },
    F: { nonsmoker: 0.42, smoker: 0.84 },
  },

  // Prime working age (35-50)
  35: {
    M: { nonsmoker: 0.89, smoker: 1.78 },
    F: { nonsmoker: 0.53, smoker: 1.06 },
  },
  40: {
    M: { nonsmoker: 1.21, smoker: 2.42 },
    F: { nonsmoker: 0.76, smoker: 1.52 },
  },
  45: {
    M: { nonsmoker: 1.76, smoker: 3.52 },
    F: { nonsmoker: 1.12, smoker: 2.24 },
  },
  50: {
    M: { nonsmoker: 2.67, smoker: 5.34 },
    F: { nonsmoker: 1.65, smoker: 3.3 },
  },

  // Pre-retirement (55-65)
  55: {
    M: { nonsmoker: 4.24, smoker: 8.48 },
    F: { nonsmoker: 2.56, smoker: 5.12 },
  },
  60: {
    M: { nonsmoker: 6.89, smoker: 13.78 },
    F: { nonsmoker: 4.12, smoker: 8.24 },
  },
  65: {
    M: { nonsmoker: 11.02, smoker: 22.04 },
    F: { nonsmoker: 6.67, smoker: 13.34 },
  },

  // Retirement age (70-85)
  70: {
    M: { nonsmoker: 17.89, smoker: 35.78 },
    F: { nonsmoker: 11.23, smoker: 22.46 },
  },
  75: {
    M: { nonsmoker: 29.56, smoker: 59.12 },
    F: { nonsmoker: 19.34, smoker: 38.68 },
  },
  80: {
    M: { nonsmoker: 49.78, smoker: 99.56 },
    F: { nonsmoker: 34.21, smoker: 68.42 },
  },
  85: {
    M: { nonsmoker: 82.45, smoker: 164.9 },
    F: { nonsmoker: 59.67, smoker: 119.34 },
  },
};

/** Sorted ages for interpolation */
const MORTALITY_AGES = Object.keys(CSO_2017_MORTALITY_RATES)
  .map(Number)
  .sort((a, b) => a - b);

// ============================================================================
// Functions
// ============================================================================

/**
 * Get base mortality rate (deaths per 1,000) for a given age, sex, and smoking status.
 * Uses linear interpolation between table ages.
 *
 * @param key - Mortality lookup key (age, sex, smoking status)
 * @returns Mortality rate per 1,000 lives per year
 */
export function getBaseMortalityRate(key: MortalityKey): number {
  const { age, sex, smokingStatus } = key;
  const clampedAge = Math.max(
    MIN_INSURABLE_AGE,
    Math.min(MAX_INSURABLE_AGE, Math.floor(age)),
  );

  // Exact match in table
  if (CSO_2017_MORTALITY_RATES[clampedAge]) {
    return CSO_2017_MORTALITY_RATES[clampedAge][sex][smokingStatus];
  }

  // Find bracketing ages for interpolation
  let lowerAge: number = MORTALITY_AGES[0] ?? MIN_INSURABLE_AGE;
  let upperAge: number =
    MORTALITY_AGES[MORTALITY_AGES.length - 1] ?? MAX_INSURABLE_AGE;

  for (let i = 0; i < MORTALITY_AGES.length - 1; i++) {
    const currentAge = MORTALITY_AGES[i];
    const nextAge = MORTALITY_AGES[i + 1];
    if (
      currentAge !== undefined &&
      nextAge !== undefined &&
      currentAge <= clampedAge &&
      nextAge >= clampedAge
    ) {
      lowerAge = currentAge;
      upperAge = nextAge;
      break;
    }
  }

  const lowerRates = CSO_2017_MORTALITY_RATES[lowerAge];
  const upperRates = CSO_2017_MORTALITY_RATES[upperAge];

  // Fallback to first available rate if lookup fails (shouldn't happen with clamped age)
  if (!lowerRates || !upperRates) {
    const fallbackAge = MORTALITY_AGES[0] ?? 18;
    const fallbackRates = CSO_2017_MORTALITY_RATES[fallbackAge];
    return fallbackRates?.[sex][smokingStatus] ?? 1.0;
  }

  const lowerRate = lowerRates[sex][smokingStatus];
  const upperRate = upperRates[sex][smokingStatus];

  // Linear interpolation
  const ageDiff = upperAge - lowerAge;
  if (ageDiff === 0) return lowerRate;

  const t = (clampedAge - lowerAge) / ageDiff;
  return lowerRate + t * (upperRate - lowerRate);
}

/**
 * Get adjusted mortality rate with health class factor applied.
 *
 * @param profile - Full risk profile
 * @returns Adjusted mortality rate per 1,000 lives per year
 */
export function getAdjustedMortalityRate(profile: RiskProfile): number {
  const baseRate = getBaseMortalityRate({
    age: profile.age,
    sex: profile.sex,
    smokingStatus: profile.smokingStatus,
  });

  const healthFactor = HEALTH_CLASS_FACTORS[profile.healthClass];
  return baseRate * healthFactor;
}

/**
 * Get mortality probability (qx) - the probability of dying within the year.
 * Converts rate per 1,000 to probability (0-1).
 *
 * @param profile - Full risk profile
 * @returns Probability of death within the year (0-1)
 */
export function getMortalityProbability(profile: RiskProfile): number {
  const ratePerThousand = getAdjustedMortalityRate(profile);
  return ratePerThousand / 1000;
}

/**
 * Calculate survival probability (px) for a given year.
 * px = 1 - qx (probability of surviving the year)
 *
 * @param profile - Full risk profile
 * @returns Probability of surviving the year (0-1)
 */
export function getSurvivalProbability(profile: RiskProfile): number {
  return 1 - getMortalityProbability(profile);
}

/**
 * Calculate cumulative survival probability over multiple years.
 * This is the probability of surviving from current age to age + years.
 *
 * @param profile - Starting risk profile
 * @param years - Number of years
 * @returns Cumulative survival probability (0-1)
 */
export function getCumulativeSurvivalProbability(
  profile: RiskProfile,
  years: number,
): number {
  let cumulativeSurvival = 1;

  for (let t = 0; t < years; t++) {
    const currentAge = Math.min(profile.age + t, MAX_INSURABLE_AGE);
    const yearProfile: RiskProfile = { ...profile, age: currentAge };
    cumulativeSurvival *= getSurvivalProbability(yearProfile);
  }

  return cumulativeSurvival;
}

/**
 * Calculate life expectancy from a given age.
 * Uses the complete life table approach with mortality rates.
 *
 * @param profile - Risk profile
 * @returns Expected remaining years of life
 */
export function getLifeExpectancy(profile: RiskProfile): number {
  let expectedYears = 0;
  let survivalProb = 1;

  for (let t = 0; t < LIFE_EXPECTANCY_CAP - profile.age; t++) {
    const currentAge = profile.age + t;
    if (currentAge > MAX_INSURABLE_AGE) {
      // Use max age mortality rate for ages beyond table
      const maxProfile: RiskProfile = { ...profile, age: MAX_INSURABLE_AGE };
      survivalProb *= getSurvivalProbability(maxProfile);
    } else {
      const yearProfile: RiskProfile = { ...profile, age: currentAge };
      survivalProb *= getSurvivalProbability(yearProfile);
    }
    expectedYears += survivalProb;
  }

  return Math.round(expectedYears * 10) / 10;
}

/**
 * Convert boolean smoker status to SmokingStatus type.
 */
export function toSmokingStatus(isSmoker: boolean): SmokingStatus {
  return isSmoker ? "smoker" : "nonsmoker";
}

/**
 * Check if an age is within insurable range.
 */
export function isInsurableAge(age: number): boolean {
  return age >= MIN_INSURABLE_AGE && age <= MAX_INSURABLE_AGE;
}
