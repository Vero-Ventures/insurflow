import { describe, expect, it } from "vitest";

import { deriveClientJourneyStatus } from "@/lib/client-journey-status";

describe("deriveClientJourneyStatus", () => {
  it("marks all stages complete when all prerequisites are met", () => {
    const status = deriveClientJourneyStatus({
      hasProfileData: true,
      hasFinancialInputs: true,
      hasInsuranceEstimate: true,
    });

    expect(status.intakeComplete).toBe(true);
    expect(status.estimateGenerated).toBe(true);
    expect(status.reportReady).toBe(true);
    expect(status.completedStages).toBe(3);
    expect(status.totalStages).toBe(3);
  });

  it("requires intake completion before estimate is considered complete", () => {
    const status = deriveClientJourneyStatus({
      hasProfileData: true,
      hasFinancialInputs: false,
      hasInsuranceEstimate: true,
    });

    expect(status.intakeComplete).toBe(false);
    expect(status.estimateGenerated).toBe(false);
    expect(status.reportReady).toBe(false);
    expect(status.completedStages).toBe(0);
  });

  it("requires estimate completion before report stage is complete", () => {
    const status = deriveClientJourneyStatus({
      hasProfileData: true,
      hasFinancialInputs: true,
      hasInsuranceEstimate: false,
    });

    expect(status.intakeComplete).toBe(true);
    expect(status.estimateGenerated).toBe(false);
    expect(status.reportReady).toBe(false);
    expect(status.completedStages).toBe(1);
  });
});
