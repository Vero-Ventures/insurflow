import { z } from "zod";

import { STATES } from "@/lib/validation/client";

export type HouseholdStatus = "single" | "partnered" | "family";

export type PrimaryGoal =
  | "family_protection"
  | "debt_coverage"
  | "retirement_security"
  | "estate_planning";

export type CommunicationPreference = "email" | "phone" | "sms";

export const HOUSEHOLD_STATUS_OPTIONS: Array<{
  value: HouseholdStatus;
  label: string;
}> = [
  { value: "single", label: "Single" },
  { value: "partnered", label: "Partnered" },
  { value: "family", label: "Family with dependents" },
];

export const PRIMARY_GOAL_OPTIONS: Array<{
  value: PrimaryGoal;
  label: string;
}> = [
  { value: "family_protection", label: "Protect my family" },
  { value: "debt_coverage", label: "Cover debt and obligations" },
  { value: "retirement_security", label: "Support retirement goals" },
  { value: "estate_planning", label: "Plan my estate" },
];

export const COMMUNICATION_PREFERENCE_OPTIONS: Array<{
  value: CommunicationPreference;
  label: string;
}> = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "sms", label: "Text message" },
];

export const onboardingProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  state: z.enum(STATES),
  householdStatus: z.enum(["single", "partnered", "family"]),
  primaryGoal: z.enum([
    "family_protection",
    "debt_coverage",
    "retirement_security",
    "estate_planning",
  ]),
  communicationPreference: z.enum(["email", "phone", "sms"]),
});

export type OnboardingProfileInput = z.infer<typeof onboardingProfileSchema>;

export type OnboardingProfileRecord = {
  firstName: string;
  lastName: string;
  state: string;
  householdStatus: HouseholdStatus;
  primaryGoal: PrimaryGoal;
  communicationPreference: CommunicationPreference;
};

export function deriveOnboardingPrefill(name: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const safeName = name?.trim();
  if (!safeName) {
    return { firstName: "", lastName: "" };
  }

  const tokens = safeName.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return { firstName: "", lastName: "" };
  }

  if (tokens.length === 1) {
    return { firstName: tokens[0] ?? "", lastName: "" };
  }

  const firstName = tokens[0] ?? "";
  const lastName = tokens.slice(1).join(" ");

  return { firstName, lastName };
}

export function isOnboardingProfileComplete(
  profile:
    | {
        firstName?: string | null;
        lastName?: string | null;
        state?: string | null;
        householdStatus?: string | null;
        primaryGoal?: string | null;
        communicationPreference?: string | null;
      }
    | null
    | undefined,
): boolean {
  if (!profile) {
    return false;
  }

  return Boolean(
    profile.firstName?.trim() &&
    profile.lastName?.trim() &&
    profile.state?.trim() &&
    profile.householdStatus &&
    profile.primaryGoal &&
    profile.communicationPreference,
  );
}
