"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import {
  COMMUNICATION_PREFERENCE_OPTIONS,
  HOUSEHOLD_STATUS_OPTIONS,
  PRIMARY_GOAL_OPTIONS,
  type OnboardingProfileInput,
} from "@/lib/onboarding";
import { AUTHENTICATED_HOME_ROUTE } from "@/lib/app-routes";
import { CANADIAN_PROVINCE_TERRITORY_OPTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type OnboardingFormProps = {
  initialProfile: Partial<OnboardingProfileInput>;
};

export function OnboardingForm({ initialProfile }: OnboardingFormProps) {
  const router = useRouter();

  const [firstName, setFirstName] = useState(initialProfile.firstName ?? "");
  const [lastName, setLastName] = useState(initialProfile.lastName ?? "");
  const [state, setState] = useState(initialProfile.state ?? "");
  const [householdStatus, setHouseholdStatus] = useState<
    OnboardingProfileInput["householdStatus"] | ""
  >(initialProfile.householdStatus ?? "");
  const [primaryGoal, setPrimaryGoal] = useState<
    OnboardingProfileInput["primaryGoal"] | ""
  >(initialProfile.primaryGoal ?? "");
  const [communicationPreference, setCommunicationPreference] = useState<
    OnboardingProfileInput["communicationPreference"] | ""
  >(initialProfile.communicationPreference ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/onboarding/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          state,
          householdStatus,
          primaryGoal,
          communicationPreference,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to save onboarding details");
      }

      toast.success("Profile saved. Welcome to InsurFlow.");
      router.replace(AUTHENTICATED_HOME_ROUTE);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to complete onboarding";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="font-display text-2xl">
          Tell us a few basics
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          This helps us personalize your estimate and application journey.
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="first-name">
                First name
              </label>
              <Input
                id="first-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="last-name">
                Last name
              </label>
              <Input
                id="last-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                required
                maxLength={100}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="state">
              Province/Territory
            </label>
            <select
              id="state"
              value={state}
              onChange={(event) => setState(event.target.value)}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              required
            >
              <option value="">Select your province or territory</option>
              {CANADIAN_PROVINCE_TERRITORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="household-status">
                Household status
              </label>
              <select
                id="household-status"
                value={householdStatus}
                onChange={(event) =>
                  setHouseholdStatus(
                    event.target.value as
                      | OnboardingProfileInput["householdStatus"]
                      | "",
                  )
                }
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                required
              >
                <option value="">Select status</option>
                {HOUSEHOLD_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="communication">
                Preferred communication
              </label>
              <select
                id="communication"
                value={communicationPreference}
                onChange={(event) =>
                  setCommunicationPreference(
                    event.target.value as
                      | OnboardingProfileInput["communicationPreference"]
                      | "",
                  )
                }
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                required
              >
                <option value="">Select preference</option>
                {COMMUNICATION_PREFERENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="primary-goal">
              Primary insurance goal
            </label>
            <select
              id="primary-goal"
              value={primaryGoal}
              onChange={(event) =>
                setPrimaryGoal(
                  event.target.value as
                    | OnboardingProfileInput["primaryGoal"]
                    | "",
                )
              }
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              required
            >
              <option value="">Select your goal</option>
              {PRIMARY_GOAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {isSubmitting ? "Saving your profile..." : "Save and continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
