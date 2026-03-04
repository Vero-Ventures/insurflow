import { describe, expect, it } from "vitest";

import {
  getMockPremiumRangeMonthly,
  mockTermLifeProvider,
} from "@/lib/providers/mock-term-life-provider";

describe("getMockPremiumRangeMonthly", () => {
  it("returns a non-binding CAD range", () => {
    const result = getMockPremiumRangeMonthly({
      age: 34,
      tobaccoUse: false,
      province: "ON",
      termYears: 20,
      coverageAmount: 500000,
    });

    expect(result.currency).toBe("CAD");
    expect(result.nonBinding).toBe(true);
    expect(result.highMonthlyPremiumCad).toBeGreaterThan(
      result.lowMonthlyPremiumCad,
    );
  });

  it("increases premiums as coverage increases", () => {
    const lowCoverage = getMockPremiumRangeMonthly({
      age: 34,
      tobaccoUse: false,
      province: "ON",
      termYears: 20,
      coverageAmount: 250000,
    });
    const highCoverage = getMockPremiumRangeMonthly({
      age: 34,
      tobaccoUse: false,
      province: "ON",
      termYears: 20,
      coverageAmount: 750000,
    });

    expect(highCoverage.lowMonthlyPremiumCad).toBeGreaterThan(
      lowCoverage.lowMonthlyPremiumCad,
    );
    expect(highCoverage.highMonthlyPremiumCad).toBeGreaterThan(
      lowCoverage.highMonthlyPremiumCad,
    );
  });

  it("submits applications with deterministic IDs", async () => {
    const first = await mockTermLifeProvider.submitApplication({
      draftId: "11111111-1111-4111-8111-111111111111",
      applicant: {
        firstName: "Alex",
        lastName: "Smith",
      },
    });
    const second = await mockTermLifeProvider.submitApplication({
      draftId: "11111111-1111-4111-8111-111111111111",
      applicant: {
        firstName: "Alex",
        lastName: "Smith",
      },
    });

    expect(first.submissionId).toBe(second.submissionId);
    expect(first.status).toBe("submitted");
  });

  it("returns status history for known submissions", async () => {
    const submission = await mockTermLifeProvider.submitApplication({
      draftId: "22222222-2222-4222-8222-222222222222",
      applicant: {
        firstName: "Taylor",
        lastName: "Green",
      },
    });

    const status = await mockTermLifeProvider.getApplicationStatus({
      submissionId: submission.submissionId,
    });

    expect(status.status).toBe("submitted");
    expect(status.events.length).toBeGreaterThan(0);
  });

  it("returns parseable timestamps for malformed submission IDs", async () => {
    const status = await mockTermLifeProvider.getApplicationStatus({
      submissionId: "not-a-uuid",
    });

    expect(status.events[0]?.at).toBe("2026-01-01T12:00:00.000Z");
    expect(Number.isNaN(Date.parse(status.events[0]?.at ?? ""))).toBe(false);
  });

  it("verifies webhook signatures", async () => {
    const verified = await mockTermLifeProvider.verifyWebhook({
      payload: "{}",
      signature: "mock-valid-signature",
    });
    const rejected = await mockTermLifeProvider.verifyWebhook({
      payload: "{}",
      signature: "invalid-signature",
    });

    expect(verified.ok).toBe(true);
    expect(rejected.ok).toBe(false);
  });
});
