/**
 * D2C journey step configuration.
 *
 * Defines the 4-step consumer application journey and provides utilities
 * for deriving the current step from intake data completeness.
 */

import type { D2cIntake } from "./intake-types";
import {
  APPLY_INTAKE_ROUTE,
  APPLY_FACT_FINDING_ROUTE,
  APPLY_ESTIMATE_ROUTE,
  APPLY_REVIEW_ROUTE,
} from "@/lib/app-routes";

export type JourneyStepId = "intake" | "fact-finding" | "estimate" | "review";

export type JourneyStepStatus =
  | "not-started"
  | "in-progress"
  | "complete"
  | "pending";

export interface JourneyStep {
  id: JourneyStepId;
  label: string;
  shortLabel: string;
  route: string;
  stepNumber: number;
}

export const JOURNEY_STEPS: readonly JourneyStep[] = [
  {
    id: "intake",
    label: "Intake Information",
    shortLabel: "Intake",
    route: APPLY_INTAKE_ROUTE,
    stepNumber: 1,
  },
  {
    id: "fact-finding",
    label: "Household Details",
    shortLabel: "Household",
    route: APPLY_FACT_FINDING_ROUTE,
    stepNumber: 2,
  },
  {
    id: "estimate",
    label: "Coverage Estimate",
    shortLabel: "Estimate",
    route: APPLY_ESTIMATE_ROUTE,
    stepNumber: 3,
  },
  {
    id: "review",
    label: "Review & Submit",
    shortLabel: "Submit",
    route: APPLY_REVIEW_ROUTE,
    stepNumber: 4,
  },
] as const;

export const TOTAL_JOURNEY_STEPS = JOURNEY_STEPS.length;

/**
 * Checks if intake (step 1) required fields are complete.
 */
function isIntakeComplete(intake: D2cIntake): boolean {
  return (
    intake.province !== "" &&
    intake.dateOfBirth !== "" &&
    intake.annualIncome > 0
  );
}

/**
 * Checks if fact-finding (step 2) fields have been addressed.
 * This step captures spouse/child info and additional goals.
 * Considered complete when user has either:
 * - Set hasSpouse with age if true
 * - Set youngestChildAge
 * - Provided additionalGoals
 * - Advanced past this step (coverageAmount > 0 implies estimate was viewed)
 */
function isFactFindingComplete(intake: D2cIntake): boolean {
  const hasSpouseInfo = intake.hasSpouse && intake.spouseAge !== null;
  const hasChildInfo = intake.youngestChildAge !== null;
  const hasGoals = intake.additionalGoals.trim() !== "";
  // If the user has set a coverage amount, they've navigated past the estimate step,
  // which implies fact-finding was completed (even if no household info was added).
  const passedEstimate = intake.coverageAmount > 0;

  return hasSpouseInfo || hasChildInfo || hasGoals || passedEstimate;
}

/**
 * Checks if estimate (step 3) has been viewed.
 * This is inferred from having coverage amount set, as users
 * typically adjust coverage after viewing the initial estimate.
 */
function isEstimateViewed(intake: D2cIntake): boolean {
  return intake.coverageAmount > 0;
}

/**
 * Derives the current step index (0-based) from intake data.
 * Returns which step the user should be on based on completion state.
 */
export function deriveCurrentStepIndex(
  intake: D2cIntake | null,
  hasAnyDraft: boolean,
): number {
  if (!intake || !hasAnyDraft) {
    return 0; // Not started - show step 1
  }

  if (!isIntakeComplete(intake)) {
    return 0; // Still on intake
  }

  if (!isFactFindingComplete(intake)) {
    return 1; // Intake done, on fact-finding
  }

  if (!isEstimateViewed(intake)) {
    return 2; // Fact-finding done, on estimate
  }

  // All prior steps complete, on review
  return 3;
}

/**
 * Gets step statuses for all journey steps based on current position.
 */
export function getJourneyStepStatuses(
  intake: D2cIntake | null,
  hasAnyDraft: boolean,
): Record<JourneyStepId, JourneyStepStatus> {
  const currentIndex = deriveCurrentStepIndex(intake, hasAnyDraft);

  const statuses: Record<JourneyStepId, JourneyStepStatus> = {
    intake: "not-started",
    "fact-finding": "not-started",
    estimate: "not-started",
    review: "not-started",
  };

  if (!hasAnyDraft) {
    return statuses;
  }

  for (let i = 0; i < JOURNEY_STEPS.length; i++) {
    const step = JOURNEY_STEPS[i];
    if (!step) continue;
    if (i < currentIndex) {
      statuses[step.id] = "complete";
    } else if (i === currentIndex) {
      statuses[step.id] = "in-progress";
    } else {
      statuses[step.id] = "pending";
    }
  }

  return statuses;
}

/**
 * Gets the route for a step, appending clientId if provided.
 */
export function getStepRouteWithClient(
  step: JourneyStep,
  clientId: string | null,
): string {
  if (!clientId) return step.route;
  return `${step.route}?clientId=${encodeURIComponent(clientId)}`;
}
