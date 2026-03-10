"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDraftPersistence } from "@/lib/d2c/use-draft-persistence";

const TOTAL_STEPS = 4;
const CURRENT_STEP = 2;

export default function ApplyFactFindingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialClientId = searchParams.get("clientId");

  const { intake, updateField, isHydrated, clientId, isSaving } =
    useDraftPersistence({ initialClientId });

  const spouseAgeValid =
    !intake.hasSpouse ||
    (intake.spouseAge !== null &&
      intake.spouseAge >= 18 &&
      intake.spouseAge <= 120);
  const youngestChildAgeValid =
    intake.youngestChildAge === null ||
    (intake.youngestChildAge >= 0 && intake.youngestChildAge <= 17);

  const isFormValid = spouseAgeValid && youngestChildAgeValid;

  if (!isHydrated) {
    return <main className="min-h-[calc(100vh-3.5rem)]" />;
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] px-4 py-8 sm:py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <section className="space-y-2">
          <p className="text-primary text-sm font-semibold tracking-wide uppercase">
            Step {CURRENT_STEP} of {TOTAL_STEPS}
          </p>
          <h1 className="font-display text-foreground text-3xl tracking-tight sm:text-4xl">
            Fact Finding
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Help us tailor your next steps with a few optional household
            details.
          </p>
        </section>

        <Card className="border-border/60 bg-card/80 p-6">
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (!isFormValid) return;
              const estimateUrl = clientId
                ? `/apply/estimate?clientId=${encodeURIComponent(clientId)}`
                : "/apply/estimate";
              router.push(estimateUrl);
            }}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="has-spouse"
                  checked={intake.hasSpouse}
                  onCheckedChange={(checked) => {
                    const hasSpouse = checked === true;
                    updateField("hasSpouse", hasSpouse);
                    if (!hasSpouse) {
                      updateField("spouseAge", null);
                    }
                  }}
                />
                <Label
                  htmlFor="has-spouse"
                  className="cursor-pointer font-normal"
                >
                  I have a spouse or partner to consider in planning
                </Label>
              </div>

              {intake.hasSpouse && (
                <div className="space-y-2">
                  <Label htmlFor="spouse-age">Spouse or partner age</Label>
                  <Input
                    id="spouse-age"
                    type="number"
                    inputMode="numeric"
                    value={intake.spouseAge ?? ""}
                    onChange={(event) =>
                      updateField(
                        "spouseAge",
                        event.target.value === ""
                          ? null
                          : parseInt(event.target.value, 10),
                      )
                    }
                    min={18}
                    max={120}
                  />
                  {!spouseAgeValid && (
                    <p className="text-destructive text-xs">
                      Enter an age between 18 and 120.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="youngest-child-age">
                Youngest child age (optional)
              </Label>
              <Input
                id="youngest-child-age"
                type="number"
                inputMode="numeric"
                value={intake.youngestChildAge ?? ""}
                onChange={(event) =>
                  updateField(
                    "youngestChildAge",
                    event.target.value === ""
                      ? null
                      : parseInt(event.target.value, 10),
                  )
                }
                min={0}
                max={17}
              />
              {!youngestChildAgeValid && (
                <p className="text-destructive text-xs">
                  Enter an age between 0 and 17.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional-goals">
                Anything else we should know? (optional)
              </Label>
              <Textarea
                id="additional-goals"
                value={intake.additionalGoals}
                onChange={(event) =>
                  updateField("additionalGoals", event.target.value)
                }
                placeholder="Examples: mortgage payoff target, education goals, or major upcoming life changes"
                maxLength={2000}
              />
            </div>

            <div className="flex items-center justify-between gap-3 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const intakeUrl = clientId
                    ? `/apply/intake?clientId=${encodeURIComponent(clientId)}`
                    : "/apply/intake";
                  router.push(intakeUrl);
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Intake
              </Button>

              <div className="flex items-center gap-3">
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
                  Continue to Estimate
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
