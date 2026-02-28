export type ClientJourneyInputs = {
  hasProfileData: boolean;
  hasFinancialInputs: boolean;
  hasInsuranceEstimate: boolean;
  hasDownloadedReport: boolean;
};

export type ClientJourneyStatus = {
  intakeComplete: boolean;
  estimateGenerated: boolean;
  reportDownloaded: boolean;
  completedStages: number;
  totalStages: number;
};

const TOTAL_STAGES = 3;

export function deriveClientJourneyStatus(
  inputs: ClientJourneyInputs,
): ClientJourneyStatus {
  const intakeComplete = inputs.hasProfileData && inputs.hasFinancialInputs;
  const estimateGenerated = intakeComplete && inputs.hasInsuranceEstimate;
  const reportDownloaded = estimateGenerated && inputs.hasDownloadedReport;

  const completedStages = [
    intakeComplete,
    estimateGenerated,
    reportDownloaded,
  ].filter(Boolean).length;

  return {
    intakeComplete,
    estimateGenerated,
    reportDownloaded,
    completedStages,
    totalStages: TOTAL_STAGES,
  };
}
