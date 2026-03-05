export type PremiumRangeEstimate = {
  lowMonthlyPremiumCad: number;
  highMonthlyPremiumCad: number;
  currency: "CAD";
  nonBinding: true;
};

export type EstimateRangeInput = {
  age: number;
  tobaccoUse: boolean;
  province: string;
  termYears: number;
  coverageAmount: number;
};

export type SubmitApplicationInput = {
  draftId: string;
  applicant: {
    firstName: string;
    lastName: string;
  };
};

export type SubmitApplicationResult = {
  submissionId: string;
  status: "submitted";
  submittedAt: string;
};

export type GetApplicationStatusInput = {
  submissionId: string;
};

export type ApplicationStatusResult = {
  submissionId: string;
  status: "submitted" | "in_review" | "approved" | "declined";
  events: Array<{
    status: "submitted" | "in_review" | "approved" | "declined";
    at: string;
    detail: string;
  }>;
};

export type VerifyWebhookInput = {
  payload: string;
  signature: string | null | undefined;
};

export type VerifyWebhookResult = {
  ok: boolean;
  providerEventId?: string;
};

export interface CarrierProvider {
  providerName: string;
  getEstimateRange(input: EstimateRangeInput): Promise<PremiumRangeEstimate>;
  submitApplication(
    input: SubmitApplicationInput,
  ): Promise<SubmitApplicationResult>;
  getApplicationStatus(
    input: GetApplicationStatusInput,
  ): Promise<ApplicationStatusResult>;
  verifyWebhook(input: VerifyWebhookInput): Promise<VerifyWebhookResult>;
}
