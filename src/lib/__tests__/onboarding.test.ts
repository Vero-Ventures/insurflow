import { describe, expect, it } from "vitest";

import {
  deriveOnboardingPrefill,
  isOnboardingProfileComplete,
  type OnboardingProfileRecord,
} from "@/lib/onboarding";

describe("onboarding helpers", () => {
  it("splits a full name into first and last names", () => {
    expect(deriveOnboardingPrefill("Ada Lovelace")).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
    });
  });

  it("uses a single token name as first name", () => {
    expect(deriveOnboardingPrefill("Madonna")).toEqual({
      firstName: "Madonna",
      lastName: "",
    });
  });

  it("returns empty prefill for blank names", () => {
    expect(deriveOnboardingPrefill("   ")).toEqual({
      firstName: "",
      lastName: "",
    });
  });

  it("identifies complete onboarding profile", () => {
    const profile: OnboardingProfileRecord = {
      firstName: "Ada",
      lastName: "Lovelace",
      state: "CA",
      householdStatus: "single",
      primaryGoal: "family_protection",
      communicationPreference: "email",
    };

    expect(isOnboardingProfileComplete(profile)).toBe(true);
  });

  it("identifies incomplete onboarding profile", () => {
    const profile: OnboardingProfileRecord = {
      firstName: "Ada",
      lastName: "",
      state: "CA",
      householdStatus: "single",
      primaryGoal: "family_protection",
      communicationPreference: "email",
    };

    expect(isOnboardingProfileComplete(profile)).toBe(false);
  });
});
