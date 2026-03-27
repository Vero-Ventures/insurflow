"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useDemoContext } from "@/components/demo/demo-context";
import { useDemoInsuranceNeeds } from "@/components/demo/use-demo-insurance-needs";
import {
  MethodologySection,
  RateTableDisplay,
} from "@/components/transparency";
import { formatCurrency } from "@/lib/client-utils";
import { demoClient } from "@/lib/demo-data";
import {
  getLifeExpectancy,
  toSmokingStatus,
} from "@/lib/financial/mortality-tables";
import { INSURANCE_NEEDS_METHODOLOGY } from "@/lib/transparency/methodology-data";
import { getStateRateTable } from "@/lib/transparency/rate-tables";

const TOTAL_STEPS = 4;
const CURRENT_STEP = 2;

function getAgeFromDateOfBirth(dateOfBirth: string): number {
  if (!dateOfBirth) return 0;
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return 0;

  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return Math.max(0, age);
}

function normalizeHealthClass(
  healthRating: string | undefined,
):
  | "preferred_plus"
  | "preferred"
  | "standard_plus"
  | "standard"
  | "substandard" {
  if (
    healthRating === "preferred_plus" ||
    healthRating === "preferred" ||
    healthRating === "standard_plus" ||
    healthRating === "standard" ||
    healthRating === "substandard"
  ) {
    return healthRating;
  }

  return "standard";
}

export default function DemoEstimatePage() {
  const router = useRouter();
  const { state, updateAnalysisAssumptions } = useDemoContext();
  const lifeExpectancyYears = getLifeExpectancy({
    age: getAgeFromDateOfBirth(demoClient.dateOfBirth),
    sex: demoClient.sex === "F" ? "F" : "M",
    smokingStatus: toSmokingStatus(Boolean(demoClient.smoker)),
    healthClass: normalizeHealthClass(demoClient.healthRating),
  });

  const { result, coverageGap } = useDemoInsuranceNeeds({
    annualHouseholdIncome: state.intakeData.annualHouseholdIncome,
    totalDebts: state.intakeData.totalDebts,
    currentCoverage: state.intakeData.currentCoverage,
    incomeReplacementPercent:
      state.analysisAssumptions.incomeReplacementPercent,
    replacementDurationYears:
      state.analysisAssumptions.replacementDurationYears,
    liquidAssets: state.analysisAssumptions.liquidAssets,
  });

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <div className="relative z-10 container mx-auto px-4 py-8 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <div className="mb-3 flex items-center gap-3">
            <span
              className="text-muted-foreground text-sm"
              data-tour="estimate-progress"
            >
              Step {CURRENT_STEP} of {TOTAL_STEPS}
            </span>
            <div className="bg-border h-1.5 w-32 overflow-hidden rounded-full">
              <div
                className="bg-emerald h-full"
                style={{ width: `${(CURRENT_STEP / TOTAL_STEPS) * 100}%` }}
              />
            </div>
          </div>

          <h1
            className="font-display text-foreground text-2xl font-semibold tracking-tight lg:text-3xl"
            data-tour="estimate-heading"
          >
            Your coverage estimate
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            This snapshot uses your intake answers to provide a first,
            non-binding estimate.
          </p>
        </div>

        <Card
          className="border-border/60 mb-6 p-6"
          data-tour="assumptions-controls"
        >
          <h2 className="text-foreground text-lg font-semibold">
            Try different assumptions
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Move the sliders to see how your estimate changes.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">
                Income replacement %
              </span>
              <input
                type="range"
                min={50}
                max={90}
                step={5}
                value={state.analysisAssumptions.incomeReplacementPercent}
                onChange={(event) =>
                  updateAnalysisAssumptions({
                    incomeReplacementPercent: Number(event.target.value),
                  })
                }
                className="w-full"
              />
              <p className="text-foreground font-medium">
                {state.analysisAssumptions.incomeReplacementPercent}%
              </p>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">
                Replacement duration
              </span>
              <input
                type="range"
                min={10}
                max={25}
                step={1}
                value={state.analysisAssumptions.replacementDurationYears}
                onChange={(event) =>
                  updateAnalysisAssumptions({
                    replacementDurationYears: Number(event.target.value),
                  })
                }
                className="w-full"
              />
              <p className="text-foreground font-medium">
                {state.analysisAssumptions.replacementDurationYears} years
              </p>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">
                Liquid assets offset
              </span>
              <input
                type="range"
                min={0}
                max={150000}
                step={5000}
                value={state.analysisAssumptions.liquidAssets}
                onChange={(event) =>
                  updateAnalysisAssumptions({
                    liquidAssets: Number(event.target.value),
                  })
                }
                className="w-full"
              />
              <p className="text-foreground font-medium">
                {formatCurrency(state.analysisAssumptions.liquidAssets)}
              </p>
            </label>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2" data-tour="estimate-kpis">
          <Card className="border-border/60 p-6">
            <h2 className="text-muted-foreground text-sm">
              Recommended Coverage
            </h2>
            <p className="text-foreground mt-2 text-3xl font-semibold">
              {formatCurrency(result.totalInsuranceNeeds)}
            </p>
          </Card>

          <Card className="border-border/60 p-6">
            <h2 className="text-muted-foreground text-sm">
              Estimated Coverage Gap
            </h2>
            <p className="text-chart-3 mt-2 text-3xl font-semibold">
              {formatCurrency(coverageGap)}
            </p>
          </Card>
        </div>

        <Card className="mt-4 border-sky-300/40 bg-sky-50/40 p-6">
          <h2 className="text-foreground text-sm font-semibold tracking-wide uppercase">
            Life expectancy
          </h2>
          <p className="text-foreground mt-2 text-base font-medium">
            Based on your profile, your life expectancy is approximately{" "}
            {lifeExpectancyYears} years.
          </p>
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
            Educational estimate derived from 2017 CSO mortality tables,
            adjusted for smoking status and health class.
          </p>
        </Card>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card className="border-border/60 p-6">
            <h3 className="text-foreground text-lg font-semibold">
              What this means
            </h3>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Based on the details you shared, this estimate is the amount that
              could help your household cover lost income, major debts, and
              final expenses if something happened to you.
            </p>
          </Card>

          <Card className="border-border/60 p-6">
            <h3 className="text-foreground text-lg font-semibold">
              Why this matters
            </h3>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              This gives you a clear starting point so you can compare options
              based on affordability and protection goals.
            </p>
          </Card>
        </div>

        <Card className="mt-6 border-amber-300/40 bg-amber-50/40 p-4">
          <p className="text-sm leading-relaxed">
            This is a non-binding estimate, not a quote or final advice. Final
            recommendations require a full review of your details.
          </p>
        </Card>

        <div className="mt-6 space-y-4" data-tour="estimate-transparency">
          <MethodologySection
            methodology={INSURANCE_NEEDS_METHODOLOGY}
            stepValues={{
              1: {
                value: formatCurrency(result.incomeReplacementNeeds),
              },
              2: {
                value: formatCurrency(result.debtPayoffNeeds),
              },
              3: {
                value: formatCurrency(result.estateBufferNeeds),
              },
              4: {
                value: formatCurrency(result.grossNeeds),
              },
              5: {
                value: formatCurrency(result.totalInsuranceNeeds),
              },
            }}
          />

          <RateTableDisplay rateTable={getStateRateTable(demoClient.state)} />
        </div>

        <div className="mt-6 flex justify-end" data-tour="showcase-next">
          <Button
            onClick={() => router.push("/demo/showcase")}
            className="bg-emerald hover:bg-emerald/90 gap-2"
          >
            Continue to explanation and report
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
