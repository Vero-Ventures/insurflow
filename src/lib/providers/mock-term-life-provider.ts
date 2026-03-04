import type {
  ApplicationStatusResult,
  CarrierProvider,
  EstimateRangeInput,
  GetApplicationStatusInput,
  PremiumRangeEstimate,
  SubmitApplicationInput,
  SubmitApplicationResult,
  VerifyWebhookInput,
  VerifyWebhookResult,
} from "@/lib/providers/carrier-provider";
import type {
  EstimatePremiumRangeInput,
  TermLifeProvider,
} from "@/lib/providers/term-life-provider";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundToWhole(value: number): number {
  return Math.round(value);
}

export function getMockPremiumRangeMonthly(
  input: EstimatePremiumRangeInput,
): PremiumRangeEstimate {
  const normalizedCoverageUnits = Math.max(1, input.coverageAmount / 1000);
  const ageFactor = clamp(0.65 + (input.age - 18) * 0.03, 0.65, 3.2);
  const tobaccoFactor = input.tobaccoUse ? 1.85 : 1;
  const termFactor = clamp(0.8 + (input.termYears - 10) * 0.025, 0.8, 1.5);

  const base = normalizedCoverageUnits * 0.075;
  const center = base * ageFactor * tobaccoFactor * termFactor;

  return {
    lowMonthlyPremiumCad: roundToWhole(center * 0.85),
    highMonthlyPremiumCad: roundToWhole(center * 1.2),
    currency: "CAD",
    nonBinding: true,
  };
}

function toDeterministicSubmissionId(draftId: string): string {
  const chars = draftId.replace(/[^a-fA-F0-9]/g, "").toLowerCase();
  const padded = (chars + "0".repeat(32)).slice(0, 32);
  return `${padded.slice(0, 8)}-${padded.slice(8, 12)}-${padded.slice(12, 16)}-${padded.slice(16, 20)}-${padded.slice(20, 32)}`;
}

function getSubmittedAt(submissionId: string): string {
  const parsedPrefix = Number.parseInt(submissionId.slice(0, 2), 16);
  const suffix = Number.isFinite(parsedPrefix) ? parsedPrefix % 28 : 0;
  const day = String(suffix + 1).padStart(2, "0");
  return `2026-01-${day}T12:00:00.000Z`;
}

async function getEstimateRange(
  input: EstimateRangeInput,
): Promise<PremiumRangeEstimate> {
  return getMockPremiumRangeMonthly(input);
}

async function submitApplication(
  input: SubmitApplicationInput,
): Promise<SubmitApplicationResult> {
  const submissionId = toDeterministicSubmissionId(input.draftId);

  return {
    submissionId,
    status: "submitted",
    submittedAt: getSubmittedAt(submissionId),
  };
}

async function getApplicationStatus(
  input: GetApplicationStatusInput,
): Promise<ApplicationStatusResult> {
  return {
    submissionId: input.submissionId,
    status: "submitted",
    events: [
      {
        status: "submitted",
        at: getSubmittedAt(input.submissionId),
        detail: "Application received by mock carrier provider",
      },
    ],
  };
}

async function verifyWebhook(
  input: VerifyWebhookInput,
): Promise<VerifyWebhookResult> {
  const ok = input.signature === "mock-valid-signature";
  return {
    ok,
    providerEventId: ok ? "mock-event-verified" : undefined,
  };
}

export const mockTermLifeProvider: CarrierProvider & TermLifeProvider = {
  providerName: "mock",
  getEstimateRange,
  submitApplication,
  getApplicationStatus,
  verifyWebhook,
  estimatePremiumRange(input) {
    return getEstimateRange(input);
  },
};
