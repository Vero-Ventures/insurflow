"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Clock3, Loader2, MapPin, Calendar } from "lucide-react";
import { useDraftPersistence } from "@/lib/d2c/use-draft-persistence";
import { captureAnalyticsEvent } from "@/lib/analytics/capture";
import { PROVINCE_NAMES, type CanadianProvince } from "@/lib/constants";

const TOTAL_STEPS = 4;
const CURRENT_STEP = 1;

/**
 * D2C eligibility intake page.
 *
 * For authenticated users, form state is persisted to the database
 * via the draft API (auto-saved with debounce on each field change).
 * For unauthenticated users, sessionStorage is used as fallback.
 */
export default function D2cIntakePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialClientId = searchParams.get("clientId");

  const { intake, updateField, isHydrated, clientId, isSaving } =
    useDraftPersistence({ initialClientId });

  useEffect(() => {
    captureAnalyticsEvent("d2c_application_started", {
      feature: "d2c-application",
      outcome: "started",
      route: "/apply/intake",
      source: "page-load",
    });
  }, []);

  const handleContinue = () => {
    // Pass clientId forward so the fact finding step can reference the draft
    const factFindingUrl = clientId
      ? `/apply/fact-finding?clientId=${encodeURIComponent(clientId)}`
      : "/apply/fact-finding";
    router.push(factFindingUrl);
  };

  const isFormValid =
    intake.province !== "" &&
    intake.dateOfBirth !== "" &&
    intake.annualIncome > 0;

  // Avoid hydration mismatch by showing skeleton until client-side hydration
  if (!isHydrated) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)]">
        <div className="container mx-auto px-4 py-8 lg:px-8">
          <div className="animate-pulse">
            <div className="bg-muted mb-8 h-8 w-64 rounded" />
            <div className="bg-muted h-96 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <div className="container mx-auto px-4 py-8 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <div className="mb-3 flex items-center gap-3">
            <span className="text-muted-foreground text-sm">
              Step {CURRENT_STEP} of {TOTAL_STEPS}
            </span>
            <div className="bg-border h-1.5 w-32 overflow-hidden rounded-full">
              <div
                className="bg-emerald h-full"
                style={{ width: `${(CURRENT_STEP / TOTAL_STEPS) * 100}%` }}
              />
            </div>
            <span className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              About 2 minutes
            </span>
          </div>

          <h1 className="font-display text-foreground text-2xl font-semibold tracking-tight lg:text-3xl">
            Let&apos;s get your estimate started
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Share a few details to see a non-binding estimate preview before
            continuing your application.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-border/60 bg-card/60 p-6">
            <form
              className="space-y-6"
              onSubmit={(event) => {
                event.preventDefault();
                handleContinue();
              }}
            >
              <div className="space-y-1">
                <p className="text-foreground text-sm font-semibold">
                  Your details
                </p>
                <p className="text-muted-foreground text-xs">
                  These fields are required to generate your estimate preview.
                </p>
              </div>

              {/* Province */}
              <div className="space-y-2">
                <Label htmlFor="province">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    Province of residence
                  </span>
                </Label>
                <p className="text-muted-foreground text-xs">
                  Where you currently live in Canada.
                </p>
                <Select
                  value={intake.province}
                  onValueChange={(value) =>
                    updateField("province", value as CanadianProvince)
                  }
                >
                  <SelectTrigger
                    id="province"
                    className="border-border/60"
                    aria-label="Province"
                  >
                    <SelectValue placeholder="Select your province" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROVINCE_NAMES).map(([code, name]) => (
                      <SelectItem key={code} value={code}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <Label htmlFor="date-of-birth">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    Date of birth
                  </span>
                </Label>
                <p className="text-muted-foreground text-xs">
                  Your age affects premium rates. You must be 18-70 years old.
                </p>
                <Input
                  id="date-of-birth"
                  type="date"
                  value={intake.dateOfBirth}
                  onChange={(event) =>
                    updateField("dateOfBirth", event.target.value)
                  }
                  className="border-border/60"
                  max={
                    new Date(
                      new Date().setFullYear(new Date().getFullYear() - 18),
                    )
                      .toISOString()
                      .split("T")[0]
                  }
                  min={
                    new Date(
                      new Date().setFullYear(new Date().getFullYear() - 70),
                    )
                      .toISOString()
                      .split("T")[0]
                  }
                />
              </div>

              {/* Tobacco Use */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="tobacco-use"
                    checked={intake.tobaccoUse}
                    onCheckedChange={(checked) =>
                      updateField("tobaccoUse", checked === true)
                    }
                  />
                  <Label
                    htmlFor="tobacco-use"
                    className="cursor-pointer font-normal"
                  >
                    I have used tobacco products in the last 12 months
                  </Label>
                </div>
                <p className="text-muted-foreground text-xs">
                  Includes cigarettes, cigars, vaping, or nicotine products.
                </p>
              </div>

              {/* Annual Income */}
              <div className="space-y-2">
                <Label htmlFor="annual-income">Annual income</Label>
                <p className="text-muted-foreground text-xs">
                  Your gross annual income. This helps determine appropriate
                  coverage levels.
                </p>
                <div className="relative">
                  <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                    $
                  </span>
                  <Input
                    id="annual-income"
                    type="number"
                    inputMode="numeric"
                    placeholder="75000"
                    value={intake.annualIncome || ""}
                    onChange={(event) =>
                      updateField(
                        "annualIncome",
                        parseInt(event.target.value, 10) || 0,
                      )
                    }
                    className="border-border/60 pl-7"
                    min={0}
                  />
                </div>
              </div>

              {/* Optional: Coverage Amount */}
              <div className="border-border/60 space-y-4 border-t pt-4">
                <div className="space-y-1">
                  <p className="text-foreground text-sm font-semibold">
                    Coverage preferences (optional)
                  </p>
                  <p className="text-muted-foreground text-xs">
                    If you have a specific coverage amount in mind, enter it
                    below.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="coverage-amount">Desired coverage</Label>
                    <div className="relative">
                      <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                        $
                      </span>
                      <Input
                        id="coverage-amount"
                        type="number"
                        inputMode="numeric"
                        placeholder="500000"
                        value={intake.coverageAmount || ""}
                        onChange={(event) =>
                          updateField(
                            "coverageAmount",
                            parseInt(event.target.value, 10) || 0,
                          )
                        }
                        className="border-border/60 pl-7"
                        min={0}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="term-years">Term length (years)</Label>
                    <Select
                      value={intake.termYears.toString()}
                      onValueChange={(value) =>
                        updateField("termYears", parseInt(value, 10))
                      }
                    >
                      <SelectTrigger
                        id="term-years"
                        className="border-border/60"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 years</SelectItem>
                        <SelectItem value="15">15 years</SelectItem>
                        <SelectItem value="20">20 years</SelectItem>
                        <SelectItem value="25">25 years</SelectItem>
                        <SelectItem value="30">30 years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="border-border/60 flex items-center justify-end gap-3 border-t pt-4">
                {isSaving && (
                  <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                    <Loader2
                      className="h-3 w-3 animate-spin"
                      aria-hidden="true"
                    />
                    Saving...
                  </span>
                )}
                <Button
                  type="submit"
                  className="bg-emerald hover:bg-emerald/90 gap-2"
                  disabled={!isFormValid}
                >
                  Continue to Fact Finding
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </Card>

          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <Card className="border-border/60 bg-card/50 p-5">
              <p className="text-foreground text-sm font-semibold">
                Why we ask these questions
              </p>
              <ul className="text-muted-foreground mt-3 space-y-2 text-sm leading-relaxed">
                <li className="flex items-start gap-2">
                  <MapPin
                    className="text-emerald mt-0.5 h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    <strong>Province:</strong> Insurance regulations and pricing
                    vary by province.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Calendar
                    className="text-emerald mt-0.5 h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    <strong>Age:</strong> Estimate ranges are calculated from
                    your current age.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald mt-0.5 h-3.5 w-3.5 shrink-0 text-center">
                    &bull;
                  </span>
                  <span>
                    <strong>Tobacco:</strong> Tobacco use changes the estimate
                    range shown in the next step.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald mt-0.5 h-3.5 w-3.5 shrink-0 text-center">
                    &bull;
                  </span>
                  <span>
                    <strong>Income:</strong> Helps ensure coverage is
                    proportionate to your needs.
                  </span>
                </li>
              </ul>
            </Card>

            <Card className="border-border/60 bg-card/40 p-5">
              <p className="text-foreground text-sm font-semibold">
                Your information is secure
              </p>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                We use bank-level encryption to protect your data. Your
                information is only used to generate your estimate preview and
                application details.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
