"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, TrendingUp, PiggyBank } from "lucide-react";
import type { UseAdvancedIncomeReplacementReturn } from "@/lib/hooks/use-advanced-income-replacement";
import { AdvancedIncomeInputPanel } from "./advanced-income-components/advanced-income-input-panel";
import { AdvancedIncomeResultsSummary } from "./advanced-income-components/advanced-income-results-summary";
import { AdvancedIncomeReplacementSkeleton } from "./advanced-income-components/advanced-income-skeleton";

interface AdvancedIncomeReplacementCardProps {
  hook: UseAdvancedIncomeReplacementReturn;
  /** Client's youngest child age (pre-filled from DB, null if not set) */
  youngestChildAge?: number | null;
  /** Client's retirement age (pre-filled from DB, null if not set) */
  retirementAge?: number | null;
  /** Client's current age */
  currentAge?: number;
  /** Client has a spouse */
  hasSpouse?: boolean;
  /** When true, hides action buttons for read-only contexts */
  isReadOnly?: boolean;
}

export function AdvancedIncomeReplacementCard({
  hook,
  youngestChildAge,
  retirementAge,
  currentAge,
  hasSpouse: _hasSpouse = false,
  isReadOnly = false,
}: AdvancedIncomeReplacementCardProps) {
  const {
    result,
    isLoading,
    error,
    calculate,
    calculatedAt,
    mode,
    calculationMetadata,
  } = hook;

  if (isLoading && !result) {
    return <AdvancedIncomeReplacementSkeleton />;
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/5 flex h-10 w-10 items-center justify-center rounded-lg">
            <TrendingUp className="text-primary h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">
              Advanced Income Replacement
            </CardTitle>
            <CardDescription>
              PV-adjusted income replacement with inflation &amp; survivor
              resources
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ---- Error Banner ---- */}
        {error && (
          <div className="border-destructive/20 bg-destructive/5 flex flex-col gap-3 rounded-xl border p-4">
            <div className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Calculation Failed</span>
            </div>
            <p className="text-destructive/80 text-sm">{error}</p>
          </div>
        )}

        {/* ---- Scenario Selector ---- */}
        {!isReadOnly && (
          <AdvancedIncomeInputPanel
            isLoading={isLoading}
            resultExists={!!result}
            onCalculate={calculate}
            youngestChildAge={youngestChildAge}
            retirementAge={retirementAge}
            currentAge={currentAge}
          />
        )}

        {/* ---- Results ---- */}
        {result && (
          <AdvancedIncomeResultsSummary
            result={result}
            calculatedAt={calculatedAt}
            mode={mode}
            calculationMetadata={calculationMetadata}
          />
        )}

        {/* No result yet, and not loading */}
        {!result && !isLoading && !error && (
          <div className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
            <PiggyBank className="h-4 w-4" />
            Select a scenario and click Calculate to see results.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
