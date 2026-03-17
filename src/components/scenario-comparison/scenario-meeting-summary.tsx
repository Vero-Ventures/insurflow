"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RotateCw, SlidersHorizontal } from "lucide-react";
import {
  calculateScenarioResults,
  formatCurrency,
  type Scenario,
} from "@/components/scenario-comparison/scenario-card";

interface ScenarioMeetingSummaryProps {
  scenarios: Scenario[];
  lastRecalculatedAt: Date;
  onRecalculate: () => void;
  onEditAssumptions: () => void;
}

type MeetingConfidence = {
  label: "High" | "Medium";
  score: number;
  note: string;
};

function getMeetingConfidence(scenarios: Scenario[]): MeetingConfidence {
  const allFieldsFilled = scenarios.every(
    (scenario) =>
      scenario.coverage.life > 0 &&
      scenario.coverage.disability > 0 &&
      scenario.coverage.criticalIllness > 0,
  );

  if (allFieldsFilled && scenarios.length >= 2) {
    return {
      label: "High",
      score: 85,
      note: "All scenarios include values for income protection and lump-sum needs.",
    };
  }

  return {
    label: "Medium",
    score: 65,
    note: "This summary is useful for discussion, but some assumptions still need professional review.",
  };
}

export function getTargetCoverageFromSortedTotals(
  sortedTotals: number[],
): number {
  if (sortedTotals.length === 0) {
    return 0;
  }

  const mid = Math.floor(sortedTotals.length / 2);

  if (sortedTotals.length % 2 === 1) {
    return sortedTotals[mid] ?? 0;
  }

  const lower = sortedTotals[mid - 1] ?? 0;
  const upper = sortedTotals[mid] ?? 0;

  return (lower + upper) / 2;
}

export function ScenarioMeetingSummary({
  scenarios,
  lastRecalculatedAt,
  onRecalculate,
  onEditAssumptions,
}: ScenarioMeetingSummaryProps) {
  const summaries = scenarios.map((scenario) => {
    const calculated = calculateScenarioResults(scenario.coverage);

    return {
      ...scenario,
      ...calculated,
    };
  });

  const sortedTotals = [...summaries]
    .map((scenario) => scenario.totalCoverage)
    .sort((a, b) => a - b);
  const targetCoverage = getTargetCoverageFromSortedTotals(sortedTotals);
  const lowCoverage = sortedTotals[0] ?? 0;
  const highCoverage = sortedTotals.at(-1) ?? 0;
  const avgPremium =
    summaries.reduce(
      (sum, scenario) => sum + scenario.estimatedAnnualPremium,
      0,
    ) / Math.max(summaries.length, 1);
  const confidence = getMeetingConfidence(scenarios);
  const recalculatedLabel = lastRecalculatedAt.toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="meeting-mode-summary">
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-lg sm:text-xl lg:text-2xl">
                Meeting Mode Summary
              </CardTitle>
              <p className="text-muted-foreground mt-1 max-w-2xl text-sm sm:text-base">
                A client-friendly snapshot of coverage options for today&apos;s
                conversation.
              </p>
            </div>
            <Badge variant="outline" className="h-6 self-start font-medium">
              Conversation view
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 rounded-lg border border-dashed p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div>
              <p className="text-sm font-medium sm:text-base">Quick actions</p>
              <p
                className="text-muted-foreground text-xs sm:text-sm"
                aria-live="polite"
              >
                Summary last recalculated at {recalculatedLabel}
              </p>
            </div>
            <div className="grid gap-2 sm:flex sm:flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={onRecalculate}
                className="w-full sm:w-auto"
              >
                <RotateCw className="size-4" data-icon="inline-start" />
                Recalculate
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={onEditAssumptions}
                className="w-full sm:w-auto"
              >
                <SlidersHorizontal
                  className="size-4"
                  data-icon="inline-start"
                />
                Edit assumptions
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              label="Target Coverage"
              value={formatCurrency(targetCoverage)}
              helper="Midpoint of current scenarios"
            />
            <MetricTile
              label="Coverage Range"
              value={`${formatCurrency(lowCoverage)} to ${formatCurrency(highCoverage)}`}
              helper="From lowest to highest scenario"
            />
            <MetricTile
              label="Avg. Annual Premium"
              value={formatCurrency(avgPremium)}
              helper="Across visible scenarios"
            />
            <MetricTile
              label="Confidence"
              value={`${confidence.label} (${confidence.score}/100)`}
              helper={confidence.note}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Scenario options at a glance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summaries.map((scenario) => (
              <div
                key={scenario.id}
                className="border-border/60 rounded-lg border p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold">{scenario.name}</h3>
                  <Badge
                    variant="secondary"
                    className="font-currency text-sm sm:text-base"
                  >
                    {formatCurrency(scenario.totalCoverage)}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 sm:text-base">
                  <InlineFact
                    label="Life insurance"
                    value={formatCurrency(scenario.coverage.life)}
                  />
                  <InlineFact
                    label="Disability"
                    value={`${formatCurrency(scenario.coverage.disability)}/mo`}
                  />
                  <InlineFact
                    label="Critical illness"
                    value={formatCurrency(scenario.coverage.criticalIllness)}
                  />
                  <InlineFact
                    label="Est. annual premium"
                    value={formatCurrency(scenario.estimatedAnnualPremium)}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Assumptions shown during the meeting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/40 p-3 sm:p-4">
              <p className="text-sm font-medium sm:text-base">
                Confidence in this estimate
              </p>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                {confidence.note}
              </p>
            </div>

            <div className="space-y-2 text-sm sm:text-base">
              <p className="font-medium">Calculation assumptions</p>
              <ul className="text-muted-foreground list-inside list-disc space-y-1 leading-relaxed">
                <li>
                  Disability coverage is displayed monthly and annualized in
                  totals.
                </li>
                <li>
                  Estimated premium values update from the current scenario
                  sliders.
                </li>
                <li>
                  This screen is a discussion summary and not final advice.
                </li>
              </ul>
            </div>

            <div className="grid gap-2">
              {summaries.map((scenario) => (
                <div
                  key={`${scenario.id}-assumptions`}
                  className="bg-muted/40 rounded-md p-3 text-sm sm:p-4 sm:text-base"
                >
                  <p className="font-medium">{scenario.name}</p>
                  <p className="text-muted-foreground mt-1 leading-relaxed">
                    Life {formatCurrency(scenario.coverage.life)} · Disability{" "}
                    {formatCurrency(scenario.coverage.disability)}/mo · Critical
                    illness {formatCurrency(scenario.coverage.criticalIllness)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="bg-muted/30 rounded-lg border border-transparent p-4 sm:p-5">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold sm:text-lg lg:text-xl">
        {value}
      </p>
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed sm:text-sm">
        {helper}
      </p>
    </div>
  );
}

function InlineFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-currency text-right font-medium">{value}</span>
    </div>
  );
}
