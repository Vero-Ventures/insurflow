/**
 * Product Recommendation Optimization Engine
 *
 * Provides intelligent insurance product recommendations based on:
 * - Client financial needs and coverage gaps
 * - Budget constraints
 * - Life stage and goals
 * - Risk tolerance
 *
 * Uses multi-criteria optimization to rank products and provide
 * actionable recommendations with explanations.
 *
 * All functions are pure and side-effect free for easy testing.
 */

import {
  calculatePremium,
  generateProductQuotes,
  calculateAffordableFaceAmount,
  type ProductType,
  type ProductQuote,
  type PremiumInput,
  PRODUCT_NAMES,
} from "./actuarial-pricing";
import { type HealthClass, type Sex } from "./mortality-tables";
import {
  SUGGESTED_INSURANCE_BUDGET_PERCENT,
  MIN_COVERAGE_INCOME_MULTIPLIER,
  TARGET_COVERAGE_INCOME_MULTIPLIER,
  MIN_INSURABLE_AGE,
  MAX_INSURABLE_AGE,
} from "@/lib/constants";

// Re-export for convenience of consumers (with original names for backward compatibility)
export const SUGGESTED_BUDGET_PERCENT = SUGGESTED_INSURANCE_BUDGET_PERCENT;
export const MIN_COVERAGE_MULTIPLIER = MIN_COVERAGE_INCOME_MULTIPLIER;
export const TARGET_COVERAGE_MULTIPLIER = TARGET_COVERAGE_INCOME_MULTIPLIER;

// ============================================================================
// Types
// ============================================================================

/** Client life stage for recommendation context */
export type LifeStage =
  | "young_single" // 18-30, no dependents
  | "young_family" // 25-45, young children
  | "established_family" // 35-55, older children
  | "pre_retirement" // 50-65, nearing retirement
  | "retirement"; // 65+, retired

/** Client's primary insurance goal */
export type InsuranceGoal =
  | "income_replacement" // Replace income for dependents
  | "debt_coverage" // Pay off mortgage/debts
  | "estate_planning" // Wealth transfer, estate taxes
  | "business_succession" // Key person, buy-sell funding
  | "final_expenses" // Funeral costs, final bills
  | "wealth_accumulation"; // Cash value growth

/** Risk tolerance for product selection */
export type RiskTolerance = "conservative" | "moderate" | "aggressive";

/** Recommendation input */
export interface RecommendationInput {
  /** Client demographics */
  age: number;
  sex: Sex;
  isSmoker: boolean;
  healthClass: HealthClass;

  /** Financial situation */
  annualIncome: number;
  totalDebts: number;
  liquidAssets: number;
  existingCoverage: number;

  /** Needs assessment */
  coverageNeeded: number;
  annualPremiumBudget?: number;

  /** Preferences */
  primaryGoal?: InsuranceGoal;
  riskTolerance?: RiskTolerance;
  prefersPermanent?: boolean;

  /** Family situation */
  hasDependents?: boolean;
  youngestDependentAge?: number;
  yearsUntilRetirement?: number;
}

/** Scored product recommendation */
export interface ProductRecommendation {
  /** Product type */
  productType: ProductType;
  /** Product display name */
  productName: string;
  /** Recommendation score (0-100) */
  score: number;
  /** Ranking (1 = best) */
  rank: number;
  /** Recommended face amount */
  recommendedFaceAmount: number;
  /** Annual premium for recommended coverage */
  annualPremium: number;
  /** Monthly premium */
  monthlyPremium: number;
  /** Whether this fits within budget */
  withinBudget: boolean;
  /** Coverage gap addressed */
  coverageGapAddressed: number;
  /** Percentage of need met */
  percentNeedMet: number;
  /** Recommendation strength */
  strength: "strong" | "moderate" | "weak";
  /** Why this product is recommended */
  reasons: string[];
  /** Potential concerns or trade-offs */
  considerations: string[];
  /** Product features */
  features: string[];
}

/** Optimization result */
export interface RecommendationResult {
  /** Ranked recommendations */
  recommendations: ProductRecommendation[];
  /** Top recommendation */
  topRecommendation: ProductRecommendation | null;
  /** Coverage analysis */
  coverageAnalysis: CoverageAnalysis;
  /** Budget analysis */
  budgetAnalysis: BudgetAnalysis;
  /** Inputs used for audit trail */
  inputsUsed: RecommendationInputSummary;
  /** Metadata */
  metadata: RecommendationMetadata;
}

/** Coverage gap analysis */
export interface CoverageAnalysis {
  /** Total coverage needed */
  totalNeed: number;
  /** Existing coverage */
  existingCoverage: number;
  /** Coverage gap (need - existing) */
  coverageGap: number;
  /** Is there a gap? */
  hasGap: boolean;
  /** Gap as percentage of need */
  gapPercentage: number;
  /** Suggested minimum coverage */
  suggestedMinimum: number;
  /** Suggested target coverage */
  suggestedTarget: number;
}

/** Budget analysis */
export interface BudgetAnalysis {
  /** Stated budget */
  statedBudget: number | null;
  /** Suggested budget (10-15% of income) */
  suggestedBudget: number;
  /** Minimum viable premium for gap coverage */
  minimumViablePremium: number;
  /** Is gap coverable within budget? */
  gapCoverableWithinBudget: boolean;
  /** Max affordable face amount within budget */
  maxAffordableFaceAmount: number;
}

/** Summarized inputs for audit */
export interface RecommendationInputSummary {
  age: number;
  sex: Sex;
  isSmoker: boolean;
  healthClass: HealthClass;
  coverageNeeded: number;
  existingCoverage: number;
  annualPremiumBudget: number | null;
  primaryGoal: InsuranceGoal;
}

/** Recommendation metadata */
export interface RecommendationMetadata {
  /** Method description */
  description: string;
  /** Scoring factors used */
  scoringFactors: string[];
  /** Generated at timestamp */
  generatedAt: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Score weights for optimization */
export const SCORE_WEIGHTS = {
  affordability: 0.25, // How well it fits budget
  coverageMatch: 0.3, // How well it addresses the gap
  suitability: 0.25, // How appropriate for life stage/goal
  value: 0.2, // Cost efficiency
};

/** Product suitability scores by goal */
const GOAL_PRODUCT_SCORES: Record<
  InsuranceGoal,
  Record<ProductType, number>
> = {
  income_replacement: {
    term_life: 95,
    whole_life: 60,
    universal_life: 70,
    variable_life: 50,
  },
  debt_coverage: {
    term_life: 90,
    whole_life: 70,
    universal_life: 75,
    variable_life: 55,
  },
  estate_planning: {
    term_life: 40,
    whole_life: 95,
    universal_life: 85,
    variable_life: 75,
  },
  business_succession: {
    term_life: 70,
    whole_life: 90,
    universal_life: 85,
    variable_life: 70,
  },
  final_expenses: {
    term_life: 50,
    whole_life: 95,
    universal_life: 80,
    variable_life: 60,
  },
  wealth_accumulation: {
    term_life: 20,
    whole_life: 80,
    universal_life: 85,
    variable_life: 95,
  },
};

/** Product suitability by life stage */
const LIFE_STAGE_PRODUCT_SCORES: Record<
  LifeStage,
  Record<ProductType, number>
> = {
  young_single: {
    term_life: 85,
    whole_life: 70,
    universal_life: 65,
    variable_life: 75,
  },
  young_family: {
    term_life: 95,
    whole_life: 65,
    universal_life: 70,
    variable_life: 55,
  },
  established_family: {
    term_life: 85,
    whole_life: 80,
    universal_life: 80,
    variable_life: 70,
  },
  pre_retirement: {
    term_life: 60,
    whole_life: 90,
    universal_life: 85,
    variable_life: 75,
  },
  retirement: {
    term_life: 30,
    whole_life: 95,
    universal_life: 80,
    variable_life: 60,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Round to 2 decimal places.
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
 * Determine life stage from age and dependent info.
 */
export function determineLifeStage(
  age: number,
  hasDependents?: boolean,
  youngestDependentAge?: number,
): LifeStage {
  if (age >= 65) return "retirement";
  if (age >= 50) return "pre_retirement";

  if (hasDependents) {
    if (youngestDependentAge !== undefined && youngestDependentAge < 10) {
      return "young_family";
    }
    return "established_family";
  }

  if (age < 35) return "young_single";
  return "established_family";
}

/**
 * Infer primary goal from client situation if not specified.
 */
export function inferPrimaryGoal(input: RecommendationInput): InsuranceGoal {
  if (input.primaryGoal) return input.primaryGoal;

  // Infer from situation
  if (input.age >= 65) return "estate_planning";
  if (input.totalDebts > input.annualIncome * 3) return "debt_coverage";
  if (input.hasDependents) return "income_replacement";
  if (input.liquidAssets > input.annualIncome * 10) return "estate_planning";

  return "income_replacement";
}

/**
 * Calculate recommended term length based on life stage.
 */
export function calculateRecommendedTerm(input: RecommendationInput): number {
  const { age, yearsUntilRetirement, youngestDependentAge, hasDependents } =
    input;

  // If dependents, cover until youngest is independent
  if (hasDependents && youngestDependentAge !== undefined) {
    const yearsUntilIndependent = Math.max(0, 18 - youngestDependentAge);
    return Math.min(30, Math.max(10, yearsUntilIndependent + 5));
  }

  // If retirement timeline known, use that
  if (yearsUntilRetirement !== undefined) {
    return Math.min(30, Math.max(10, yearsUntilRetirement));
  }

  // Default based on age
  if (age < 35) return 30;
  if (age < 45) return 20;
  if (age < 55) return 15;
  return 10;
}

// ============================================================================
// Scoring Functions
// ============================================================================

/**
 * Calculate affordability score (0-100).
 * Higher score = more affordable relative to budget.
 */
function calculateAffordabilityScore(
  annualPremium: number,
  budget: number,
): number {
  if (budget <= 0) return 50; // No budget constraint

  const ratio = annualPremium / budget;

  if (ratio <= 0.5) return 100; // Well under budget
  if (ratio <= 0.75) return 90;
  if (ratio <= 1.0) return 80; // At budget
  if (ratio <= 1.25) return 60;
  if (ratio <= 1.5) return 40;
  if (ratio <= 2.0) return 20;
  return 10; // Far over budget
}

/**
 * Calculate coverage match score (0-100).
 * Higher score = better addresses the coverage gap.
 */
function calculateCoverageMatchScore(
  coverageProvided: number,
  coverageGap: number,
): number {
  if (coverageGap <= 0) return 100; // No gap to fill

  const ratio = coverageProvided / coverageGap;

  if (ratio >= 1.0) return 100; // Fully addresses gap
  if (ratio >= 0.9) return 95;
  if (ratio >= 0.75) return 85;
  if (ratio >= 0.5) return 70;
  if (ratio >= 0.25) return 50;
  return 30;
}

/**
 * Calculate suitability score (0-100).
 * Based on life stage and goal alignment.
 */
function calculateSuitabilityScore(
  productType: ProductType,
  lifeStage: LifeStage,
  goal: InsuranceGoal,
): number {
  const goalScore = GOAL_PRODUCT_SCORES[goal][productType];
  const stageScore = LIFE_STAGE_PRODUCT_SCORES[lifeStage][productType];

  // Weighted average: goal is more important
  return Math.round(goalScore * 0.6 + stageScore * 0.4);
}

/**
 * Calculate value score (0-100).
 * Based on cost per $1,000 of coverage relative to alternatives.
 */
function calculateValueScore(
  costPerThousand: number,
  allCostsPerThousand: number[],
): number {
  if (allCostsPerThousand.length === 0) return 50;

  const minCost = Math.min(...allCostsPerThousand);
  const maxCost = Math.max(...allCostsPerThousand);

  if (maxCost === minCost) return 75; // All same cost

  // Linear scale: min cost = 100, max cost = 20
  const ratio = (costPerThousand - minCost) / (maxCost - minCost);
  return Math.round(100 - ratio * 80);
}

/**
 * Generate reasons for recommending a product.
 */
function generateReasons(
  productType: ProductType,
  score: number,
  lifeStage: LifeStage,
  goal: InsuranceGoal,
  withinBudget: boolean,
  percentNeedMet: number,
): string[] {
  const reasons: string[] = [];

  // Product-specific reasons
  switch (productType) {
    case "term_life":
      reasons.push("Most affordable coverage option");
      if (goal === "income_replacement" || goal === "debt_coverage") {
        reasons.push("Ideal for temporary protection needs");
      }
      if (lifeStage === "young_family") {
        reasons.push(
          "Perfect for protecting young families during peak earning years",
        );
      }
      break;

    case "whole_life":
      reasons.push("Guaranteed lifetime coverage");
      reasons.push("Builds cash value over time");
      if (goal === "estate_planning") {
        reasons.push("Excellent for wealth transfer and estate planning");
      }
      break;

    case "universal_life":
      reasons.push("Flexible premium payments");
      reasons.push("Adjustable death benefit");
      if (goal === "wealth_accumulation") {
        reasons.push("Cash value growth with interest crediting");
      }
      break;

    case "variable_life":
      reasons.push("Investment-linked growth potential");
      if (goal === "wealth_accumulation") {
        reasons.push("Highest growth potential through market exposure");
      }
      break;
  }

  // Budget and coverage reasons
  if (withinBudget) {
    reasons.push("Fits within your premium budget");
  }

  if (percentNeedMet >= 100) {
    reasons.push("Fully addresses your coverage gap");
  } else if (percentNeedMet >= 75) {
    reasons.push(
      `Addresses ${Math.round(percentNeedMet)}% of your coverage gap`,
    );
  }

  return reasons;
}

/**
 * Generate considerations/trade-offs for a product.
 */
function generateConsiderations(
  productType: ProductType,
  score: number,
  withinBudget: boolean,
  percentNeedMet: number,
  age: number,
): string[] {
  const considerations: string[] = [];

  switch (productType) {
    case "term_life":
      considerations.push("Coverage ends when term expires");
      considerations.push("No cash value accumulation");
      if (age > 50) {
        considerations.push("Renewal premiums may be significantly higher");
      }
      break;

    case "whole_life":
      considerations.push("Higher premiums than term life");
      considerations.push("Less flexible than universal life");
      break;

    case "universal_life":
      considerations.push("Requires monitoring to prevent policy lapse");
      considerations.push("Interest rates affect cash value growth");
      break;

    case "variable_life":
      considerations.push("Investment risk - cash value can decrease");
      considerations.push("Higher fees than other permanent options");
      considerations.push("Requires investment knowledge");
      break;
  }

  if (!withinBudget) {
    considerations.push("Exceeds your stated premium budget");
  }

  if (percentNeedMet < 75) {
    considerations.push("May not fully address your coverage needs");
  }

  return considerations;
}

// ============================================================================
// Main API Functions
// ============================================================================

/**
 * Generate optimized product recommendations based on client profile and needs.
 *
 * @param input - Client information and preferences
 * @returns Ranked recommendations with analysis
 */
export function generateRecommendations(
  input: RecommendationInput,
): RecommendationResult {
  // Normalize inputs
  const normalizedInput = {
    ...input,
    age: clamp(Math.floor(input.age), MIN_INSURABLE_AGE, MAX_INSURABLE_AGE),
    coverageNeeded: Math.max(0, input.coverageNeeded),
    existingCoverage: Math.max(0, input.existingCoverage ?? 0),
    annualIncome: Math.max(0, input.annualIncome),
    totalDebts: Math.max(0, input.totalDebts ?? 0),
    liquidAssets: Math.max(0, input.liquidAssets ?? 0),
  };

  // Determine context
  const lifeStage = determineLifeStage(
    normalizedInput.age,
    normalizedInput.hasDependents,
    normalizedInput.youngestDependentAge,
  );
  const primaryGoal = inferPrimaryGoal(normalizedInput);
  const recommendedTerm = calculateRecommendedTerm(normalizedInput);

  // Calculate coverage analysis
  const coverageGap = Math.max(
    0,
    normalizedInput.coverageNeeded - normalizedInput.existingCoverage,
  );
  const suggestedMinimum =
    normalizedInput.annualIncome * MIN_COVERAGE_MULTIPLIER;
  const suggestedTarget =
    normalizedInput.annualIncome * TARGET_COVERAGE_MULTIPLIER;

  const coverageAnalysis: CoverageAnalysis = {
    totalNeed: normalizedInput.coverageNeeded,
    existingCoverage: normalizedInput.existingCoverage,
    coverageGap,
    hasGap: coverageGap > 0,
    gapPercentage:
      normalizedInput.coverageNeeded > 0
        ? roundCurrency((coverageGap / normalizedInput.coverageNeeded) * 100)
        : 0,
    suggestedMinimum,
    suggestedTarget,
  };

  // Calculate budget analysis
  const suggestedBudget = roundCurrency(
    normalizedInput.annualIncome * SUGGESTED_BUDGET_PERCENT,
  );
  const effectiveBudget =
    normalizedInput.annualPremiumBudget ?? suggestedBudget;

  // Generate quotes for all products
  const productTypes: ProductType[] = [
    "term_life",
    "whole_life",
    "universal_life",
    "variable_life",
  ];

  const quotes = generateProductQuotes(
    {
      age: normalizedInput.age,
      sex: normalizedInput.sex,
      isSmoker: normalizedInput.isSmoker,
      healthClass: normalizedInput.healthClass,
      faceAmount: coverageGap > 0 ? coverageGap : suggestedTarget,
      termYears: recommendedTerm,
    },
    productTypes,
  );

  // Calculate all costs per thousand for value scoring
  const allCostsPerThousand = quotes.map((q) => q.costPerThousand);

  // Score and rank products
  const recommendations: ProductRecommendation[] = quotes.map((quote) => {
    // Determine actual coverage provided (may be limited by budget)
    let recommendedFaceAmount = quote.faceAmount;
    let annualPremium = quote.annualPremium;
    let monthlyPremium = quote.monthlyPremium;

    // If over budget, calculate what's affordable
    if (annualPremium > effectiveBudget && effectiveBudget > 0) {
      recommendedFaceAmount = calculateAffordableFaceAmount(effectiveBudget, {
        age: normalizedInput.age,
        sex: normalizedInput.sex,
        isSmoker: normalizedInput.isSmoker,
        healthClass: normalizedInput.healthClass,
        productType: quote.productType,
        termYears: recommendedTerm,
      });

      const adjustedQuote = calculatePremium({
        productType: quote.productType,
        faceAmount: recommendedFaceAmount,
        age: normalizedInput.age,
        sex: normalizedInput.sex,
        isSmoker: normalizedInput.isSmoker,
        healthClass: normalizedInput.healthClass,
        termYears: recommendedTerm,
      });

      annualPremium = adjustedQuote.annualPremium;
      monthlyPremium = adjustedQuote.monthlyPremium;
    }

    const withinBudget = annualPremium <= effectiveBudget;
    const coverageGapAddressed = Math.min(recommendedFaceAmount, coverageGap);
    const percentNeedMet =
      coverageGap > 0
        ? roundCurrency((coverageGapAddressed / coverageGap) * 100)
        : 100;

    // Calculate component scores
    const affordabilityScore = calculateAffordabilityScore(
      annualPremium,
      effectiveBudget,
    );
    const coverageMatchScore = calculateCoverageMatchScore(
      recommendedFaceAmount,
      coverageGap,
    );
    const suitabilityScore = calculateSuitabilityScore(
      quote.productType,
      lifeStage,
      primaryGoal,
    );
    // If face amount was adjusted due to budget constraints, recalculate cost per thousand
    const adjustedCostPerThousand =
      recommendedFaceAmount > 0
        ? annualPremium / (recommendedFaceAmount / 1000)
        : quote.costPerThousand;
    const valueScore = calculateValueScore(
      adjustedCostPerThousand,
      allCostsPerThousand,
    );

    // Weighted total score
    const totalScore = Math.round(
      affordabilityScore * SCORE_WEIGHTS.affordability +
        coverageMatchScore * SCORE_WEIGHTS.coverageMatch +
        suitabilityScore * SCORE_WEIGHTS.suitability +
        valueScore * SCORE_WEIGHTS.value,
    );

    // Determine strength
    let strength: "strong" | "moderate" | "weak";
    if (totalScore >= 80) strength = "strong";
    else if (totalScore >= 60) strength = "moderate";
    else strength = "weak";

    return {
      productType: quote.productType,
      productName: quote.productName,
      score: totalScore,
      rank: 0, // Set after sorting
      recommendedFaceAmount,
      annualPremium,
      monthlyPremium,
      withinBudget,
      coverageGapAddressed,
      percentNeedMet,
      strength,
      reasons: generateReasons(
        quote.productType,
        totalScore,
        lifeStage,
        primaryGoal,
        withinBudget,
        percentNeedMet,
      ),
      considerations: generateConsiderations(
        quote.productType,
        totalScore,
        withinBudget,
        percentNeedMet,
        normalizedInput.age,
      ),
      features: quote.features,
    };
  });

  // Sort by score (highest first) and assign ranks
  recommendations.sort((a, b) => b.score - a.score);
  recommendations.forEach((rec, idx) => {
    rec.rank = idx + 1;
  });

  // Find minimum viable premium (cheapest way to cover gap)
  const termQuote = quotes.find((q) => q.productType === "term_life");
  const minimumViablePremium = termQuote?.annualPremium ?? 0;

  // Calculate max affordable face amount
  const maxAffordableFaceAmount =
    effectiveBudget > 0
      ? calculateAffordableFaceAmount(effectiveBudget, {
          age: normalizedInput.age,
          sex: normalizedInput.sex,
          isSmoker: normalizedInput.isSmoker,
          healthClass: normalizedInput.healthClass,
          productType: "term_life",
          termYears: recommendedTerm,
        })
      : 0;

  const budgetAnalysis: BudgetAnalysis = {
    statedBudget: normalizedInput.annualPremiumBudget ?? null,
    suggestedBudget,
    minimumViablePremium,
    gapCoverableWithinBudget: minimumViablePremium <= effectiveBudget,
    maxAffordableFaceAmount,
  };

  return {
    recommendations,
    topRecommendation: recommendations[0] ?? null,
    coverageAnalysis,
    budgetAnalysis,
    inputsUsed: {
      age: normalizedInput.age,
      sex: normalizedInput.sex,
      isSmoker: normalizedInput.isSmoker,
      healthClass: normalizedInput.healthClass,
      coverageNeeded: normalizedInput.coverageNeeded,
      existingCoverage: normalizedInput.existingCoverage,
      annualPremiumBudget: normalizedInput.annualPremiumBudget ?? null,
      primaryGoal,
    },
    metadata: {
      description:
        "Multi-criteria optimization balancing affordability, coverage match, suitability, and value",
      scoringFactors: [
        `Affordability (${SCORE_WEIGHTS.affordability * 100}%): Budget fit`,
        `Coverage Match (${SCORE_WEIGHTS.coverageMatch * 100}%): Gap addressed`,
        `Suitability (${SCORE_WEIGHTS.suitability * 100}%): Life stage and goal alignment`,
        `Value (${SCORE_WEIGHTS.value * 100}%): Cost efficiency`,
      ],
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Get quick product recommendation without full analysis.
 *
 * @param age - Client age
 * @param coverageNeeded - Required coverage amount
 * @param annualBudget - Annual premium budget
 * @returns Best fitting product type
 */
export function getQuickRecommendation(
  age: number,
  coverageNeeded: number,
  annualBudget: number,
): {
  productType: ProductType;
  reason: string;
} {
  // Simple decision tree based on age and budget
  const lifeStage = determineLifeStage(age);

  // Estimate term life premium
  const termPremiumEstimate =
    (coverageNeeded / 1000) * (age < 40 ? 0.5 : age < 55 ? 1.2 : 3.0);
  const canAffordTerm = termPremiumEstimate <= annualBudget;

  if (lifeStage === "retirement") {
    return {
      productType: "whole_life",
      reason: "Whole life provides guaranteed coverage for estate planning",
    };
  }

  if (
    lifeStage === "pre_retirement" &&
    annualBudget > termPremiumEstimate * 2
  ) {
    return {
      productType: "universal_life",
      reason: "Universal life offers flexibility as you approach retirement",
    };
  }

  if (canAffordTerm) {
    return {
      productType: "term_life",
      reason: "Term life provides maximum coverage for your budget",
    };
  }

  return {
    productType: "term_life",
    reason: "Term life is most affordable; consider reducing coverage amount",
  };
}

/**
 * Compare two product recommendations side by side.
 */
export function compareProducts(
  input: Omit<PremiumInput, "productType">,
  productA: ProductType,
  productB: ProductType,
): {
  productA: ProductQuote;
  productB: ProductQuote;
  comparison: {
    premiumDifference: number;
    premiumDifferencePercent: number;
    recommendation: ProductType;
    reason: string;
  };
} {
  const quotes = generateProductQuotes(input, [productA, productB]);
  const quoteA = quotes.find((q) => q.productType === productA);
  const quoteB = quotes.find((q) => q.productType === productB);

  if (!quoteA || !quoteB) {
    const availableTypes =
      quotes.map((q) => q.productType).join(", ") || "none";
    throw new Error(
      `Missing product quotes for comparison. Requested: ${productA}, ${productB}. Available: ${availableTypes}`,
    );
  }

  const premiumDifference = quoteB.annualPremium - quoteA.annualPremium;
  const premiumDifferencePercent =
    quoteA.annualPremium > 0
      ? roundCurrency((premiumDifference / quoteA.annualPremium) * 100)
      : 0;

  // Simple comparison logic
  let recommendation: ProductType;
  let reason: string;

  if (productA === "term_life" && productB !== "term_life") {
    if (premiumDifferencePercent > 100) {
      recommendation = productA;
      reason = `${PRODUCT_NAMES[productA]} is $${roundCurrency(premiumDifference)} cheaper per year; choose permanent only if you need lifetime coverage`;
    } else {
      recommendation = productB;
      reason = `${PRODUCT_NAMES[productB]} provides lifetime coverage for a reasonable premium difference`;
    }
  } else if (quoteA.annualPremium <= quoteB.annualPremium) {
    recommendation = productA;
    reason = `${PRODUCT_NAMES[productA]} is more affordable at $${quoteA.annualPremium}/year`;
  } else {
    recommendation = productB;
    reason = `${PRODUCT_NAMES[productB]} is more affordable at $${quoteB.annualPremium}/year`;
  }

  return {
    productA: quoteA,
    productB: quoteB,
    comparison: {
      premiumDifference: roundCurrency(Math.abs(premiumDifference)),
      premiumDifferencePercent: Math.abs(premiumDifferencePercent),
      recommendation,
      reason,
    },
  };
}
