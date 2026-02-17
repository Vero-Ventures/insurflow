"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useDemoContext } from "@/components/demo/demo-context";
import {
  calculateInsuranceNeedsRounded,
  DEFAULT_ESTATE_BUFFER,
} from "@/lib/financial/insurance-needs";
import { formatCurrency } from "@/lib/client-utils";

const TOTAL_STEPS = 3;
const CURRENT_STEP = 2;
const DEMO_INCOME_REPLACEMENT_PERCENT = 70;
const DEMO_REPLACEMENT_DURATION_YEARS = 15;
const DEMO_LIQUID_ASSETS = 70000;
const DEMO_TOTAL_ASSETS = 1277000;

function toNumber(value: string): number {
  const normalized = value.replace(/[^\d.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function DemoEstimatePage() {
  const router = useRouter();
  const { state } = useDemoContext();

  const result = useMemo(() => {
    const householdIncome = toNumber(state.intakeData.annualHouseholdIncome);
    const totalDebts = toNumber(state.intakeData.totalDebts);
    const currentCoverage = toNumber(state.intakeData.currentCoverage);

    return calculateInsuranceNeedsRounded({
      clientIncome: householdIncome,
      spouseIncome: 0,
      includeSpouseIncome: false,
      incomeReplacementPercent: DEMO_INCOME_REPLACEMENT_PERCENT,
      replacementDurationYears: DEMO_REPLACEMENT_DURATION_YEARS,
      existingLifeInsuranceCoverage: currentCoverage,
      totalDebts,
      liquidAssets: DEMO_LIQUID_ASSETS,
      totalAssets: DEMO_TOTAL_ASSETS,
      estateBuffer: DEFAULT_ESTATE_BUFFER,
    });
  }, [
    state.intakeData.annualHouseholdIncome,
    state.intakeData.currentCoverage,
    state.intakeData.totalDebts,
  ]);

  const coverageGap = Math.max(
    0,
    result.totalInsuranceNeeds - result.existingCoverage,
  );

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
          </div>

          <h1 className="font-display text-foreground text-2xl font-semibold tracking-tight lg:text-3xl">
            Your estimated coverage need
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            This snapshot uses your intake answers to provide a first estimate.
            Your advisor will validate every number with you.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
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
              This gives your advisor a clear starting point so your review can
              focus on practical choices, affordability, and protection goals
              that fit your family.
            </p>
          </Card>
        </div>

        <Card className="mt-6 border-amber-300/40 bg-amber-50/40 p-4">
          <p className="text-sm leading-relaxed">
            This is an estimate, not final advice. A licensed advisor must
            review your full financial details before any recommendation is
            finalized.
          </p>
        </Card>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={() => router.push("/demo/handoff")}
            className="bg-emerald hover:bg-emerald/90 gap-2"
          >
            Continue to Advisor Handoff
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
