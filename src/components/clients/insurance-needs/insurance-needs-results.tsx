"use client";

import { Home, PiggyBank, Shield, TrendingUp, Wallet } from "lucide-react";

import { formatCurrency } from "@/lib/client-utils";
import { cn } from "@/lib/utils";
import type { InsuranceNeedsResult } from "@/lib/hooks/use-insurance-needs";

interface InsuranceNeedsResultsProps {
  result: InsuranceNeedsResult;
}

export function InsuranceNeedsResults({ result }: InsuranceNeedsResultsProps) {
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
    <>
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
              - {formatCurrency(existingCoverage + liquidAssets)} deductions
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
    </>
  );
}
