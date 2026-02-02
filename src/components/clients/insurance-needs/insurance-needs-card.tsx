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
import { RefreshCw, AlertCircle } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/client-utils";
import { cn } from "@/lib/utils";
import type { InsuranceNeedsResult } from "@/lib/hooks/use-insurance-needs";

interface InsuranceNeedsCardProps {
  result: InsuranceNeedsResult | null;
  isLoading: boolean;
  error: string | null;
  onRecalculate?: () => Promise<void>;
  calculatedAt: string | null;
  /** When true, hides action buttons for read-only contexts like reports */
  isReadOnly?: boolean;
}

export function InsuranceNeedsCard({
  result,
  isLoading,
  error,
  onRecalculate,
  calculatedAt,
  isReadOnly = false,
}: InsuranceNeedsCardProps) {
  if (isLoading) {
    return <InsuranceNeedsCardSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Insurance Needs Analysis</CardTitle>
          <CardDescription>
            Error loading insurance needs calculation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-destructive/10 text-destructive flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Failed to calculate</span>
            </div>
            <p className="text-sm">{error}</p>
            {!isReadOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRecalculate}
                className="w-fit"
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
      <Card>
        <CardHeader>
          <CardTitle>Insurance Needs Analysis</CardTitle>
          <CardDescription>
            Calculate recommended insurance coverage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground py-4 text-center">
            <p className={isReadOnly ? "" : "mb-4"}>
              No calculation available. Please ensure client financial
              information is complete.
            </p>
            {!isReadOnly && (
              <Button onClick={onRecalculate}>
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
  } = result;

  const hasData =
    incomeReplacementNeeds > 0 ||
    debtPayoffNeeds > 0 ||
    estateBufferNeeds > 0 ||
    existingCoverage > 0 ||
    liquidAssets > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Insurance Needs Analysis</CardTitle>
          <CardDescription>
            Breakdown of recommended insurance coverage
          </CardDescription>
        </div>
        {!isReadOnly && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRecalculate}
            className="shrink-0"
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
          <h4 className="mb-3 text-sm font-medium">Gross Insurance Needs</h4>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="bg-muted/50 rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">
                Income Replacement
              </p>
              <p className="text-lg font-semibold">
                {formatCurrency(incomeReplacementNeeds)}
              </p>
              {result.inputsUsed.incomeReplacementPercent > 0 && (
                <p className="text-muted-foreground mt-1 text-xs">
                  {result.inputsUsed.incomeReplacementPercent}% of income for{" "}
                  {result.inputsUsed.replacementDurationYears} years
                </p>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">Debt Payoff</p>
              <p className="text-lg font-semibold">
                {formatCurrency(debtPayoffNeeds)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Total outstanding debts
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">Estate Buffer</p>
              <p className="text-lg font-semibold">
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
          <h4 className="mb-3 text-sm font-medium">Existing Resources</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="bg-muted/50 rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">
                Existing Life Insurance
              </p>
              <p className="text-lg font-semibold">
                {formatCurrency(existingCoverage)}
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">Liquid Assets</p>
              <p className="text-lg font-semibold">
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
            "rounded-lg border p-6",
            totalInsuranceNeeds > 0
              ? "bg-primary/5 dark:bg-primary/10"
              : "bg-green-50 dark:bg-green-950/20",
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                className={cn(
                  "text-sm font-medium",
                  totalInsuranceNeeds > 0
                    ? "text-primary"
                    : "text-green-700 dark:text-green-300",
                )}
              >
                Total Insurance Needs
              </p>
              <p
                className={cn(
                  "text-3xl font-bold",
                  totalInsuranceNeeds > 0
                    ? "text-primary"
                    : "text-green-600 dark:text-green-400",
                )}
              >
                {formatCurrency(totalInsuranceNeeds)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-sm">Gross Needs</p>
              <p className="text-xl font-semibold">
                {formatCurrency(grossNeeds)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                − {formatCurrency(existingCoverage + liquidAssets)} deductions
              </p>
            </div>
          </div>
          {totalInsuranceNeeds === 0 && (
            <p className="mt-2 text-sm text-green-600 dark:text-green-400">
              Existing resources are sufficient - no additional coverage needed
            </p>
          )}
        </div>

        {/* Data Summary */}
        {hasData && (
          <div className="text-muted-foreground border-t pt-4 text-xs">
            <p className="font-medium">Calculation Summary:</p>
            <ul className="mt-1 space-y-1">
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
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </CardHeader>
      <CardContent className="space-y-6">
        <Skeleton className="h-4 w-40" />

        {/* Gross Needs Skeleton */}
        <div>
          <Skeleton className="mb-3 h-4 w-32" />
          <div className="grid gap-3 md:grid-cols-3">
            <div className="bg-muted/50 rounded-lg border p-4">
              <Skeleton className="mb-2 h-4 w-32" />
              <Skeleton className="h-7 w-28" />
              <Skeleton className="mt-2 h-3 w-40" />
            </div>
            <div className="bg-muted/50 rounded-lg border p-4">
              <Skeleton className="mb-2 h-4 w-24" />
              <Skeleton className="h-7 w-28" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
            <div className="bg-muted/50 rounded-lg border p-4">
              <Skeleton className="mb-2 h-4 w-28" />
              <Skeleton className="h-7 w-28" />
              <Skeleton className="mt-2 h-3 w-32" />
            </div>
          </div>
        </div>

        {/* Deductions Skeleton */}
        <div>
          <Skeleton className="mb-3 h-4 w-32" />
          <div className="grid gap-3 md:grid-cols-2">
            <div className="bg-muted/50 rounded-lg border p-4">
              <Skeleton className="mb-2 h-4 w-40" />
              <Skeleton className="h-7 w-28" />
            </div>
            <div className="bg-muted/50 rounded-lg border p-4">
              <Skeleton className="mb-2 h-4 w-32" />
              <Skeleton className="h-7 w-28" />
            </div>
          </div>
        </div>

        {/* Total Skeleton */}
        <div className="bg-muted/50 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="mb-2 h-4 w-40" />
              <Skeleton className="h-10 w-40" />
            </div>
            <div className="text-right">
              <Skeleton className="mb-2 h-4 w-24" />
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
