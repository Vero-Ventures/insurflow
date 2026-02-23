"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight,
  BriefcaseBusiness,
  Clock3,
  FileText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  useDemoContext,
  type HouseholdStatus,
} from "@/components/demo/demo-context";
import { demoScenarios } from "@/lib/demo-data";
import { formatCurrency } from "@/lib/client-utils";

const TOTAL_STEPS = 4;
const CURRENT_STEP = 1;

export default function DemoIntakePage() {
  const router = useRouter();
  const { state, updateIntakeData } = useDemoContext();
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);
  const selectedScenario =
    demoScenarios.find(
      (scenario) => scenario.id === state.selectedScenarioId,
    ) ?? demoScenarios[0];

  if (!selectedScenario) {
    return null;
  }

  const handleContinue = () => {
    router.push("/demo/estimate");
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <div className="relative z-10 container mx-auto px-4 py-8 lg:px-8">
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
              <Clock3 className="h-3.5 w-3.5" />
              About 5-7 minutes
            </span>
          </div>

          <h1
            className="font-display text-foreground text-2xl font-semibold tracking-tight lg:text-3xl"
            data-tour="intake-heading"
          >
            Tell us about your household
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Answer two quick questions to get a first estimate. You can add more
            details if you want a tighter result.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card
            className="border-border/60 bg-card/60 p-6"
            data-tour="intake-form"
          >
            <form
              className="space-y-6"
              onSubmit={(event) => {
                event.preventDefault();
                handleContinue();
              }}
            >
              <div className="space-y-1">
                <p className="text-foreground text-sm font-semibold">
                  Household profile
                </p>
                <p className="text-muted-foreground text-xs">
                  Start with the basics. You can expand this form any time.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="household-status">Household status</Label>
                <p className="text-muted-foreground text-xs">
                  Choose the option that best describes you today.
                </p>
                <Select
                  value={state.intakeData.householdStatus}
                  onValueChange={(value) =>
                    updateIntakeData({
                      householdStatus: value as HouseholdStatus,
                    })
                  }
                >
                  <SelectTrigger
                    id="household-status"
                    className="border-border/60"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="partnered">Partnered</SelectItem>
                    <SelectItem value="single_parent">Single parent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="annual-income">Annual household income</Label>
                  <p className="text-muted-foreground text-xs">
                    An estimate is fine. This helps size income replacement.
                  </p>
                  <Input
                    id="annual-income"
                    inputMode="numeric"
                    placeholder="210000"
                    value={state.intakeData.annualHouseholdIncome}
                    onChange={(event) =>
                      updateIntakeData({
                        annualHouseholdIncome: event.target.value,
                      })
                    }
                    className="border-border/60"
                  />
                </div>
              </div>

              {!showOptionalDetails ? (
                <div className="border-t pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowOptionalDetails(true)}
                  >
                    Add more details (optional)
                  </Button>
                </div>
              ) : null}

              {showOptionalDetails ? (
                <>
                  <div className="space-y-1 border-t pt-5">
                    <p className="text-foreground text-sm font-semibold">
                      Optional details
                    </p>
                    <p className="text-muted-foreground text-xs">
                      These can sharpen the estimate, but you can skip them.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="total-debts">Total debts</Label>
                      <p className="text-muted-foreground text-xs">
                        Include mortgage, loans, and credit cards.
                      </p>
                      <Input
                        id="total-debts"
                        inputMode="numeric"
                        placeholder="515500"
                        value={state.intakeData.totalDebts}
                        onChange={(event) =>
                          updateIntakeData({ totalDebts: event.target.value })
                        }
                        className="border-border/60"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="current-coverage">
                        Current life insurance coverage
                      </Label>
                      <p className="text-muted-foreground text-xs">
                        Enter 0 if you do not have coverage yet.
                      </p>
                      <Input
                        id="current-coverage"
                        inputMode="numeric"
                        placeholder="250000"
                        value={state.intakeData.currentCoverage}
                        onChange={(event) =>
                          updateIntakeData({
                            currentCoverage: event.target.value,
                          })
                        }
                        className="border-border/60"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="primary-goal">
                      What matters most for your family?
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      A short note is enough. You can skip this for now.
                    </p>
                    <Textarea
                      id="primary-goal"
                      rows={4}
                      value={state.intakeData.primaryGoal}
                      onChange={(event) =>
                        updateIntakeData({ primaryGoal: event.target.value })
                      }
                      className="border-border/60"
                    />
                  </div>
                </>
              ) : null}

              <div className="border-border/60 flex justify-end border-t pt-4">
                <Button
                  type="submit"
                  className="bg-emerald hover:bg-emerald/90 gap-2"
                >
                  See Estimate now
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </Card>

          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <Card className="border-border/60 bg-card/50 p-5">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="text-emerald h-4 w-4" />
                <p className="text-foreground text-sm font-semibold">
                  Active scenario
                </p>
              </div>
              <p className="text-foreground text-sm font-medium">
                {selectedScenario.name}
              </p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {selectedScenario.headline}
              </p>

              <div className="mt-4 grid gap-2 text-sm">
                <div className="bg-muted/40 flex items-center justify-between rounded-md px-3 py-2">
                  <span className="text-muted-foreground inline-flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" /> Coverage
                  </span>
                  <span className="text-foreground font-medium">
                    {formatCurrency(selectedScenario.recommendedCoverage)}
                  </span>
                </div>
                <div className="bg-muted/40 flex items-center justify-between rounded-md px-3 py-2">
                  <span className="text-muted-foreground inline-flex items-center gap-1.5">
                    <BriefcaseBusiness className="h-3.5 w-3.5" /> Premium
                  </span>
                  <span className="text-foreground font-medium">
                    {formatCurrency(selectedScenario.estimatedAnnualPremium)}/yr
                  </span>
                </div>
              </div>
            </Card>

            <Card className="border-border/60 bg-card/40 p-5">
              <p className="text-foreground text-sm font-semibold">
                After intake
              </p>
              <ul className="text-muted-foreground mt-2 space-y-2 text-sm leading-relaxed">
                <li className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-3.5 w-3.5" />
                  Instant estimate with editable assumptions
                </li>
                <li className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-3.5 w-3.5" />
                  AI letter and report preview for advisor follow-up
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
