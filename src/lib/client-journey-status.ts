export type ClientJourneyInputs = {
  hasProfileData: boolean;
  hasFinancialInputs: boolean;
  hasInsuranceEstimate: boolean;
};

export type ClientJourneyStatus = {
  intakeComplete: boolean;
  estimateGenerated: boolean;
  reportReady: boolean;
  completedStages: number;
  totalStages: number;
};

const TOTAL_STAGES = 3;

export function deriveClientJourneyStatus(
  inputs: ClientJourneyInputs,
): ClientJourneyStatus {
  const intakeComplete = inputs.hasProfileData && inputs.hasFinancialInputs;
  const estimateGenerated = intakeComplete && inputs.hasInsuranceEstimate;
  const reportReady = estimateGenerated;

  const completedStages = [
    intakeComplete,
    estimateGenerated,
    reportReady,
  ].filter(Boolean).length;

  return {
    intakeComplete,
    estimateGenerated,
    reportReady,
    completedStages,
    totalStages: TOTAL_STAGES,
  };
}
