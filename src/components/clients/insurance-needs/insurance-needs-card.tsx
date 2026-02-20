"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  AlertCircle,
  Shield,
  Wallet,
  Home,
  TrendingUp,
  PiggyBank,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/client-utils";
import { cn } from "@/lib/utils";
import type { InsuranceNeedsResult } from "@/lib/hooks/use-insurance-needs";
import type {
  ConfidenceLabel,
  ConfidenceResult,
} from "@/lib/financial/confidence-scoring";

const MAX_CONFIDENCE_REASONS_TO_DISPLAY = 6;

interface InsuranceNeedsCardProps {
  result: InsuranceNeedsResult | null;
  isLoading: boolean;
  error: string | null;
  onRecalculate?: () => Promise<void>;
  calculatedAt: string | null;
  /** Confidence metadata (score, label, reasons); optional when not yet calculated via API */
  confidence?: ConfidenceResult | null;
  /** When true, hides action buttons for read-only contexts like reports */
  isReadOnly?: boolean;
}

function getConfidenceStyles(label: ConfidenceLabel) {
  switch (label) {
    case "High":
      return {
        container: "border-emerald/30 bg-emerald/5",
        badge: "border-emerald/30 bg-emerald/10 text-emerald",
      };
    case "Medium":
      return {
        container: "border-amber/30 bg-amber/5",
        badge: "border-amber/30 bg-amber/10 text-amber-700",
      };
    case "Low":
    default:
      return {
        container: "border-destructive/30 bg-destructive/5",
        badge: "border-destructive/30 bg-destructive/10 text-destructive",
      };
  }
}

export function InsuranceNeedsCard({
  result,
  isLoading,
  error,
  onRecalculate,
  calculatedAt,
  confidence,
  isReadOnly = false,
}: InsuranceNeedsCardProps) {
  if (isLoading) {
    return <InsuranceNeedsCardSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-destructive/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <Shield className="text-destructive h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">
                Insurance Needs Analysis
              </CardTitle>
              <CardDescription>
                Error loading insurance needs calculation
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border-destructive/20 bg-destructive/5 flex flex-col gap-3 rounded-xl border p-4">
            <div className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Calculation Failed</span>
            </div>
            <p className="text-destructive/80 text-sm">{error}</p>
            {!isReadOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRecalculate}
                className="border-destructive/30 text-destructive hover:bg-destructive/10 w-fit"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-primary/5 flex h-10 w-10 items-center justify-center rounded-lg">
              <Shield className="text-primary h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">
                Insurance Needs Analysis
              </CardTitle>
              <CardDescription>
                Calculate recommended insurance coverage
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground py-6 text-center">
            <p className={isReadOnly ? "" : "mb-4"}>
              No calculation available. Please ensure client financial
              information is complete.
            </p>
            {!isReadOnly && (
              <Button onClick={onRecalculate} className="bg-primary">
                <RefreshCw className="mr-2 h-4 w-4" />
                Calculate Now
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const {
    incomeReplacementNeeds,
    debtPayoffNeeds,
    estateBufferNeeds,
    grossNeeds,
    existingCoverage,
    liquidAssets,
    totalInsuranceNeeds,
    totalInsuranceNeedsBand,
    policyCount,
    coverageSource,
  } = result;

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/5 flex h-10 w-10 items-center justify-center rounded-lg">
            <Shield className="text-primary h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Insurance Needs Analysis</CardTitle>
            <CardDescription>
              Breakdown of recommended insurance coverage
            </CardDescription>
          </div>
        </div>
        {!isReadOnly && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRecalculate}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Recalculate
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {calculatedAt && (
          <p className="text-muted-foreground text-sm">
            Calculated: {formatDateTime(calculatedAt)}
          </p>
        )}

        {/* Gross Needs Breakdown */}
        <div>
          <h4 className="text-foreground mb-3 text-sm font-semibold">
            Gross Insurance Needs
          </h4>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="bg-muted/30 rounded-xl border p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="bg-chart-1/10 flex h-7 w-7 items-center justify-center rounded-lg">
                  <Wallet className="text-chart-1 h-3.5 w-3.5" />
                </div>
                <p className="text-muted-foreground text-sm font-medium">
                  Income Replacement
                </p>
              </div>
              <p className="font-currency text-lg font-semibold">
                {formatCurrency(incomeReplacementNeeds)}
              </p>
              {result.inputsUsed.incomeReplacementPercent > 0 && (
                <p className="text-muted-foreground mt-1 text-xs">
                  {result.inputsUsed.incomeReplacementPercent}% of income for{" "}
                  {result.inputsUsed.replacementDurationYears} years
                </p>
              )}
            </div>

            <div className="bg-muted/30 rounded-xl border p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="bg-chart-3/10 flex h-7 w-7 items-center justify-center rounded-lg">
                  <Home className="text-chart-3 h-3.5 w-3.5" />
                </div>
                <p className="text-muted-foreground text-sm font-medium">
                  Debt Payoff
                </p>
              </div>
              <p className="font-currency text-lg font-semibold">
                {formatCurrency(debtPayoffNeeds)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Total outstanding debts
              </p>
            </div>

            <div className="bg-muted/30 rounded-xl border p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="bg-chart-5/10 flex h-7 w-7 items-center justify-center rounded-lg">
                  <TrendingUp className="text-chart-5 h-3.5 w-3.5" />
                </div>
                <p className="text-muted-foreground text-sm font-medium">
                  Estate Buffer
                </p>
              </div>
              <p className="font-currency text-lg font-semibold">
                {formatCurrency(estateBufferNeeds)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {result.inputsUsed.estateBufferType === "fixed"
                  ? "Fixed amount"
                  : `${result.inputsUsed.estateBufferValue}% of assets`}
              </p>
            </div>
          </div>
        </div>

        {/* Deductions */}
        <div>
          <h4 className="text-foreground mb-3 text-sm font-semibold">
            Existing Resources
          </h4>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="bg-muted/30 rounded-xl border p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="bg-insurance/10 flex h-7 w-7 items-center justify-center rounded-lg">
                  <Shield className="text-insurance h-3.5 w-3.5" />
                </div>
                <p className="text-muted-foreground text-sm font-medium">
                  Existing Life Insurance
                </p>
              </div>
              <p className="font-currency text-lg font-semibold">
                {formatCurrency(existingCoverage)}
              </p>
              {coverageSource === "policies" && policyCount !== undefined && (
                <p className="text-muted-foreground mt-1 text-xs">
                  From {policyCount} active{" "}
                  {policyCount === 1 ? "policy" : "policies"}
                </p>
              )}
              {coverageSource === "legacy" && (
                <p className="text-muted-foreground mt-1 text-xs">
                  Manual entry (no policies tracked)
                </p>
              )}
            </div>

            <div className="bg-muted/30 rounded-xl border p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="bg-asset/10 flex h-7 w-7 items-center justify-center rounded-lg">
                  <PiggyBank className="text-asset h-3.5 w-3.5" />
                </div>
                <p className="text-muted-foreground text-sm font-medium">
                  Liquid Assets
                </p>
              </div>
              <p className="font-currency text-lg font-semibold">
                {formatCurrency(liquidAssets)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Cash and readily accessible funds
              </p>
            </div>
          </div>
        </div>

        {/* Total Needs - Emphasized */}
        <div
          className={cn(
            "rounded-xl border p-6",
            totalInsuranceNeeds > 0
              ? "border-primary/20 bg-primary/5"
              : "border-asset/20 bg-asset/5",
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                className={cn(
                  "text-sm font-semibold",
                  totalInsuranceNeeds > 0 ? "text-primary" : "text-asset",
                )}
              >
                Total Insurance Needs
              </p>
              <p
                className={cn(
                  "font-currency text-3xl font-bold",
                  totalInsuranceNeeds > 0 ? "text-primary" : "text-asset",
                )}
              >
                {formatCurrency(totalInsuranceNeeds)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-sm font-medium">
                Gross Needs
              </p>
              <p className="font-currency text-xl font-semibold">
                {formatCurrency(grossNeeds)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                − {formatCurrency(existingCoverage + liquidAssets)} deductions
              </p>
            </div>
          </div>
          {totalInsuranceNeeds === 0 && (
            <p className="text-asset mt-3 text-sm font-medium">
              Existing resources are sufficient - no additional coverage needed
            </p>
          )}
          {totalInsuranceNeedsBand && totalInsuranceNeeds > 0 && (
            <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-4 text-sm">
              <span className="font-medium">Recommendation range:</span>
              <span>
                Low {formatCurrency(totalInsuranceNeedsBand.low)}
                <span className="mx-1.5">·</span>
                Target {formatCurrency(totalInsuranceNeedsBand.target)}
                <span className="mx-1.5">·</span>
                High {formatCurrency(totalInsuranceNeedsBand.high)}
              </span>
            </div>
          )}
        </div>

        {/* Confidence */}
        {confidence && (
          <div
            className={cn(
              "rounded-xl border p-4",
              getConfidenceStyles(confidence.label).container,
            )}
          >
            <h4 className="text-foreground mb-2 text-sm font-semibold">
              Confidence in this estimate
            </h4>

            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "font-medium",
                  getConfidenceStyles(confidence.label).badge,
                )}
              >
                {confidence.label}
              </Badge>

              <span className="text-muted-foreground text-sm">
                Score: {confidence.score}/100
              </span>
            </div>

            <p className="text-muted-foreground mb-3 text-xs">
              Confidence reflects how complete your data is and whether we used
              default assumptions. Higher scores mean the estimate is based more
              on your actual inputs.
            </p>

            {confidence.label !== "High" && (
              <div className="text-muted-foreground mb-2 text-xs">
                Confidence is reduced due to missing inputs or default
                assumptions:
              </div>
            )}

            {confidence.reasons.length > 0 && confidence.label !== "High" && (
              <ul className="text-muted-foreground list-inside list-disc space-y-0.5 text-xs">
                {confidence.reasons
                  .slice(0, MAX_CONFIDENCE_REASONS_TO_DISPLAY)
                  .map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
              </ul>
            )}

            {confidence.label === "High" && (
              <p className="text-muted-foreground text-xs">
                Your key inputs are complete and the estimate uses minimal
                defaults.
              </p>
            )}
          </div>
        )}

        {/* Data Summary */}
        {(result.inputsUsed.clientIncome > 0 ||
          result.inputsUsed.spouseIncome > 0) && (
          <div className="border-border/60 text-muted-foreground border-t pt-4 text-xs">
            <p className="font-medium">Calculation Summary:</p>
            <ul className="mt-1.5 space-y-0.5">
              <li>
                Client Income: {formatCurrency(result.inputsUsed.clientIncome)}
                {result.inputsUsed.includeSpouseIncome &&
                  result.inputsUsed.spouseIncome > 0 && (
                    <>
                      {" "}
                      + Spouse: {formatCurrency(result.inputsUsed.spouseIncome)}
                    </>
                  )}
              </li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InsuranceNeedsCardSkeleton() {
  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-9 w-28" />
      </CardHeader>
      <CardContent className="space-y-6">
        <Skeleton className="h-4 w-40" />

        {/* Gross Needs Skeleton */}
        <div>
          <Skeleton className="mb-3 h-4 w-32" />
          <div className="grid gap-3 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-muted/30 rounded-xl border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Skeleton className="h-7 w-7 rounded-lg" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-6 w-28" />
                <Skeleton className="mt-2 h-3 w-32" />
              </div>
            ))}
          </div>
        </div>

        {/* Deductions Skeleton */}
        <div>
          <Skeleton className="mb-3 h-4 w-32" />
          <div className="grid gap-3 md:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-muted/30 rounded-xl border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Skeleton className="h-7 w-7 rounded-lg" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-28" />
              </div>
            ))}
          </div>
        </div>

        {/* Total Skeleton */}
        <div className="bg-muted/30 rounded-xl border p-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="mb-2 h-4 w-36" />
              <Skeleton className="h-9 w-40" />
            </div>
            <div className="text-right">
              <Skeleton className="mb-2 h-4 w-24" />
              <Skeleton className="h-7 w-32" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
