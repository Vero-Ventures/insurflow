/**
 * Pure confidence scoring for estimate/recommendation results.
 * No UI or API dependencies; reusable in any pipeline.
 *
 * Confidence is based on:
 * - Data completeness: missing key inputs reduce confidence
 * - Assumption stability: use of defaults/assumptions reduces confidence
 *
 * Output: score (0–100), label (High/Medium/Low), and reasons[] in plain language.
 */

export type ConfidenceLabel = "High" | "Medium" | "Low";

export interface ConfidenceResult {
  /** 0–100; higher = more confident */
  score: number;
  label: ConfidenceLabel;
  /** Plain-language reasons (e.g. missing data, defaults used) */
  reasons: string[];
}

/** Which key inputs were provided / have data (not missing) */
export interface EstimateCompleteness {
  clientIncome: boolean;
  spouseIncome: boolean;
  incomeReplacementPercent: boolean;
  replacementDurationYears: boolean;
  existingCoverage: boolean;
  debtsData: boolean;
  assetsData: boolean;
  estateBuffer: boolean;
}

/** Which assumptions/defaults were used in the calculation */
export interface EstimateAssumptionsUsed {
  replacementDurationYears: boolean;
  estateBuffer: boolean;
  includeSpouseIncome: boolean;
}

export interface EstimateConfidenceInput {
  completeness: EstimateCompleteness;
  assumptionsUsed: EstimateAssumptionsUsed;
}

const SCORE_MAX = 100;
const PENALTY_PER_MISSING_INPUT = 10;
const PENALTY_PER_ASSUMPTION = 5;
const LABEL_HIGH_MIN = 70;
const LABEL_MEDIUM_MIN = 40;

function clampScore(score: number): number {
  return Math.max(0, Math.min(SCORE_MAX, Math.round(score)));
}

function labelFromScore(score: number): ConfidenceLabel {
  if (score >= LABEL_HIGH_MIN) return "High";
  if (score >= LABEL_MEDIUM_MIN) return "Medium";
  return "Low";
}

/**
 * Computes confidence for an estimate based on data completeness and assumption stability.
 * Pure function: no side effects, no UI or API logic.
 *
 * @param input - completeness flags and which defaults were used
 * @returns score (0–100), label (High/Medium/Low), and plain-language reasons
 */
export function computeEstimateConfidence(
  input: EstimateConfidenceInput,
): ConfidenceResult {
  const reasons: string[] = [];
  let score = SCORE_MAX;

  const { completeness, assumptionsUsed } = input;

  if (!completeness.clientIncome) {
    score -= PENALTY_PER_MISSING_INPUT;
    reasons.push("Client income is missing");
  }
  if (!completeness.spouseIncome) {
    score -= PENALTY_PER_MISSING_INPUT;
    reasons.push("Spouse income is missing");
  }
  if (!completeness.incomeReplacementPercent) {
    score -= PENALTY_PER_MISSING_INPUT;
    reasons.push("Income replacement percentage is missing");
  }
  if (!completeness.replacementDurationYears) {
    score -= PENALTY_PER_MISSING_INPUT;
    reasons.push("Replacement duration is missing");
  }
  if (!completeness.existingCoverage) {
    score -= PENALTY_PER_MISSING_INPUT;
    reasons.push("Existing life insurance coverage is missing");
  }
  if (!completeness.debtsData) {
    score -= PENALTY_PER_MISSING_INPUT;
    reasons.push("Debt information is missing");
  }
  if (!completeness.assetsData) {
    score -= PENALTY_PER_MISSING_INPUT;
    reasons.push("Asset information is missing");
  }
  if (!completeness.estateBuffer) {
    score -= PENALTY_PER_MISSING_INPUT;
    reasons.push("Estate buffer is missing");
  }

  if (assumptionsUsed.replacementDurationYears) {
    score -= PENALTY_PER_ASSUMPTION;
    reasons.push("Using default replacement duration (10 years)");
  }
  if (assumptionsUsed.estateBuffer) {
    score -= PENALTY_PER_ASSUMPTION;
    reasons.push("Using default estate buffer ($15,000)");
  }
  if (assumptionsUsed.includeSpouseIncome) {
    score -= PENALTY_PER_ASSUMPTION;
    reasons.push("Using default for including spouse income");
  }

  const clamped = clampScore(score);
  const label = labelFromScore(clamped);

  if (reasons.length === 0) {
    reasons.push("All key inputs provided and no defaults used");
  }

  return {
    score: clamped,
    label,
    reasons,
  };
}
