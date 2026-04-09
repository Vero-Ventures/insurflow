"use client";

import { Badge } from "@/components/ui/badge";
import { DEFAULT_INCOME_REPLACEMENT_PERCENT } from "@/lib/constants";
import {
  Landmark,
  ShieldCheck,
  Wallet,
  Receipt,
  DollarSign,
  Info,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/client-utils";
import { cn } from "@/lib/utils";
import { IncomeReplacementSchedule } from "../income-replacement-schedule";
import type { AdvancedIncomeReplacementResponse } from "@/lib/hooks/use-advanced-income-replacement";

interface AdvancedIncomeResultsProps {
  result: AdvancedIncomeReplacementResponse;
  calculatedAt?: string | null;
  mode?: "income-multiplier" | "expense-based" | null;
  calculationMetadata?: {
    modeDescription: string;
    assumptions: string[];
  } | null;
}

export function AdvancedIncomeResultsSummary({
  result,
  calculatedAt,
  mode,
  calculationMetadata,
}: Readonly<AdvancedIncomeResultsProps>) {
  if (!result) return null;

  const displayMode = result.resolvedInputs.mode ?? mode;

  return (
    <div className="space-y-6">
      {calculatedAt && (
        <p className="text-muted-foreground text-sm">
          Calculated: {formatDateTime(calculatedAt)}
        </p>
      )}

      {/* PV Summary Cards */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="bg-muted/30 rounded-xl border p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="bg-chart-1/10 flex h-7 w-7 items-center justify-center rounded-lg">
              <Wallet className="text-chart-1 h-3.5 w-3.5" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              Gross Income PV
            </p>
          </div>
          <p className="font-currency text-lg font-semibold">
            {formatCurrency(result.presentValueTotal)}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {result.durationYears} years, inflation-adjusted
          </p>
        </div>

        <div className="bg-muted/30 rounded-xl border p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="bg-chart-3/10 flex h-7 w-7 items-center justify-center rounded-lg">
              <Landmark className="text-chart-3 h-3.5 w-3.5" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              Survivor Resources PV
            </p>
          </div>
          <p className="font-currency text-lg font-semibold">
            {formatCurrency(result.survivorResourcesPV)}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Govt benefits, insurance &amp; income
          </p>
        </div>

        <div className="bg-muted/30 rounded-xl border p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="bg-chart-5/10 flex h-7 w-7 items-center justify-center rounded-lg">
              <ShieldCheck className="text-chart-5 h-3.5 w-3.5" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              Net Coverage Gap PV
            </p>
          </div>
          <p className="font-currency text-lg font-semibold">
            {formatCurrency(result.netCoverageNeededPV)}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Additional coverage recommended
          </p>
        </div>
      </div>

      {/* Net Coverage Emphasis */}
      <div
        className={cn(
          "rounded-xl border p-6",
          result.netCoverageNeededPV > 0
            ? "border-primary/20 bg-primary/5"
            : "border-green-500/20 bg-green-500/5",
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <p
              className={cn(
                "text-sm font-semibold",
                result.netCoverageNeededPV > 0
                  ? "text-primary"
                  : "text-green-600",
              )}
            >
              Net Income Replacement Need
            </p>
            <p
              className={cn(
                "font-currency text-3xl font-bold",
                result.netCoverageNeededPV > 0
                  ? "text-primary"
                  : "text-green-600",
              )}
            >
              {formatCurrency(result.netCoverageNeededPV)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-sm font-medium">
              Duration
            </p>
            <p className="text-foreground text-xl font-semibold">
              {result.durationYears} years
            </p>
          </div>
        </div>
        {result.netCoverageNeededPV === 0 && (
          <p className="mt-3 text-sm font-medium text-green-600">
            Survivor resources fully cover income replacement needs
          </p>
        )}
      </div>

      {/* Resolved Inputs Summary */}
      <div className="border-border/60 text-muted-foreground space-y-1 border-t pt-4 text-xs">
        <div className="mb-2 flex items-center gap-2">
          <p className="font-medium">Parameters Used:</p>
          {displayMode && (
            <Badge
              variant={
                displayMode === "expense-based" ? "secondary" : "outline"
              }
              className="text-xs"
            >
              {displayMode === "expense-based" ? (
                <>
                  <Receipt className="mr-1 h-3 w-3" />
                  Expense-Based
                </>
              ) : (
                <>
                  <DollarSign className="mr-1 h-3 w-3" />
                  Income-Multiplier
                </>
              )}
            </Badge>
          )}
        </div>
        <ul className="mt-1.5 grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
          {/* Show mode-specific inputs */}
          {displayMode === "expense-based" ? (
            <>
              <li>
                Annual Expenses:{" "}
                {formatCurrency(result.resolvedInputs.annualExpenses ?? 0)}
              </li>
              <li>
                Expense Reduction:{" "}
                {(
                  (result.resolvedInputs.expenseReductionPercent ?? 0) * 100
                ).toFixed(0)}
                %
              </li>
              <li>
                Adjusted Annual Need:{" "}
                {formatCurrency(result.resolvedInputs.annualBaselineNeed ?? 0)}
              </li>
            </>
          ) : (
            <>
              <li>
                Base Income:{" "}
                {formatCurrency(result.resolvedInputs.baseAnnualIncome ?? 0)}
              </li>
              <li>
                Replacement Ratio:{" "}
                {(
                  (result.resolvedInputs.replacementRatio ??
                    DEFAULT_INCOME_REPLACEMENT_PERCENT / 100) * 100
                ).toFixed(0)}
                %
              </li>
            </>
          )}
          <li>
            Inflation: {(result.resolvedInputs.inflationRate * 100).toFixed(1)}%
          </li>
          <li>
            Discount: {(result.resolvedInputs.discountRate * 100).toFixed(1)}%
          </li>
          {result.resolvedInputs.survivorResources.govSurvivorBenefit > 0 && (
            <li>
              Govt Benefit:{" "}
              {formatCurrency(
                result.resolvedInputs.survivorResources.govSurvivorBenefit,
              )}
              /yr
            </li>
          )}
          {result.resolvedInputs.survivorResources.existingInsurance > 0 && (
            <li>
              Existing Insurance:{" "}
              {formatCurrency(
                result.resolvedInputs.survivorResources.existingInsurance,
              )}
            </li>
          )}
        </ul>

        {/* Assumptions tooltip */}
        {calculationMetadata && (
          <div className="border-border/40 bg-muted/20 mt-3 rounded-lg border p-3">
            <div className="text-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium">
              <Info className="h-3.5 w-3.5" />
              Calculation Assumptions
            </div>
            <p className="text-muted-foreground mb-2">
              {calculationMetadata.modeDescription}
            </p>
            <ul className="text-muted-foreground list-inside list-disc space-y-0.5">
              {calculationMetadata.assumptions
                .slice(0, 4)
                .map((assumption: string) => (
                  <li key={assumption}>{assumption}</li>
                ))}
            </ul>
          </div>
        )}
      </div>

      {/* Year-by-Year Schedule (collapsible) */}
      <IncomeReplacementSchedule schedule={result.annualSchedule} />
    </div>
  );
}
