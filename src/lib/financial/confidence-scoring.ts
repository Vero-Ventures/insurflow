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

type CompletenessCheck = {
  key: keyof EstimateCompleteness;
  reason: string;
};

type AssumptionCheck = {
  key: keyof EstimateAssumptionsUsed;
  reason: string;
};

const COMPLETENESS_CHECKS: CompletenessCheck[] = [
  { key: "clientIncome", reason: "Client income is missing" },
  { key: "spouseIncome", reason: "Spouse income is missing" },
  {
    key: "incomeReplacementPercent",
    reason: "Income replacement percentage is missing",
  },
  {
    key: "replacementDurationYears",
    reason: "Replacement duration is missing",
  },
  {
    key: "existingCoverage",
    reason: "Existing life insurance coverage is missing",
  },
  { key: "debtsData", reason: "Debt information is missing" },
  { key: "assetsData", reason: "Asset information is missing" },
  { key: "estateBuffer", reason: "Estate buffer is missing" },
];

const ASSUMPTION_CHECKS: AssumptionCheck[] = [
  {
    key: "replacementDurationYears",
    reason: "Using default replacement duration (10 years)",
  },
  { key: "estateBuffer", reason: "Using default estate buffer ($15,000)" },
  {
    key: "includeSpouseIncome",
    reason: "Using default for including spouse income",
  },
];

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

  for (const check of COMPLETENESS_CHECKS) {
    if (!completeness[check.key]) {
      score -= PENALTY_PER_MISSING_INPUT;
      reasons.push(check.reason);
    }
  }

  for (const check of ASSUMPTION_CHECKS) {
    if (assumptionsUsed[check.key]) {
      score -= PENALTY_PER_ASSUMPTION;
      reasons.push(check.reason);
    }
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
