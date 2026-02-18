"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, Sparkles } from "lucide-react";
import { useDemoContext } from "@/components/demo/demo-context";
import { useDemoInsuranceNeeds } from "@/components/demo/use-demo-insurance-needs";
import { demoLetter } from "@/lib/demo-data";
import { formatCurrency } from "@/lib/client-utils";

const TOTAL_STEPS = 4;
const CURRENT_STEP = 3;
export default function DemoShowcasePage() {
  const router = useRouter();
  const { state } = useDemoContext();

  const { result } = useDemoInsuranceNeeds({
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
            Turn calculations into advisor-ready deliverables
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            This guided showcase demonstrates how one analysis becomes a
            compliance-ready narrative and a client-facing report.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/60 p-6" data-tour="ai-letter-preview">
            <div className="flex items-center gap-2">
              <Sparkles className="text-emerald h-4 w-4" />
              <h2 className="text-foreground text-lg font-semibold">
                AI Reasons Why letter preview
              </h2>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              Auto-generated explanation using the selected assumptions and
              intake profile.
            </p>
            <div className="bg-muted/40 mt-4 max-h-[280px] overflow-y-auto rounded-lg p-4 text-sm leading-relaxed">
              {demoLetter
                .split("\n\n")
                .slice(0, 3)
                .map((paragraph, index) => (
                  <p key={index} className="mb-3 last:mb-0">
                    {paragraph}
                  </p>
                ))}
            </div>
          </Card>

          <Card className="border-border/60 p-6" data-tour="report-preview">
            <div className="flex items-center gap-2">
              <FileText className="text-primary h-4 w-4" />
              <h2 className="text-foreground text-lg font-semibold">
                Client report preview
              </h2>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              Export-ready summary advisors can review before meeting the
              client.
            </p>
            <div className="mt-4 grid gap-3">
              <div className="bg-muted/40 rounded-lg p-4">
                <p className="text-muted-foreground text-xs">
                  Recommended coverage
                </p>
                <p className="text-foreground text-2xl font-semibold">
                  {formatCurrency(result.totalInsuranceNeeds)}
                </p>
              </div>
              <div className="bg-muted/40 rounded-lg p-4">
                <p className="text-muted-foreground text-xs">
                  Income replacement assumption
                </p>
                <p className="text-foreground text-base font-medium">
                  {state.analysisAssumptions.incomeReplacementPercent}% for{" "}
                  {state.analysisAssumptions.replacementDurationYears} years
                </p>
              </div>
              <div className="bg-muted/40 rounded-lg p-4">
                <p className="text-muted-foreground text-xs">
                  Liquid assets offset
                </p>
                <p className="text-foreground text-base font-medium">
                  {formatCurrency(state.analysisAssumptions.liquidAssets)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-6 flex justify-end" data-tour="showcase-handoff">
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
