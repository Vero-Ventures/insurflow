"use client";

import { Shield, TrendingUp, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/client-utils";
import { aggregatePolicyCoverage, type Policy } from "@/types/policy";

interface PoliciesSummaryProps {
  items: Policy[];
}

export function PoliciesSummary({ items }: PoliciesSummaryProps) {
  const { totalActiveCoverage, totalPolicies, activePolicies } =
    aggregatePolicyCoverage(items);
  const inactivePolicies = totalPolicies - activePolicies;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="bg-muted/30 rounded-xl border p-5">
        <div className="text-muted-foreground mb-2 flex items-center gap-2 text-sm">
          <div className="bg-insurance/10 flex h-8 w-8 items-center justify-center rounded-lg">
            <Shield className="text-insurance h-4 w-4" />
          </div>
          <p className="font-medium">Total Active Coverage</p>
        </div>
        <p className="font-currency text-foreground text-2xl font-bold">
          {formatCurrency(totalActiveCoverage)}
        </p>
        <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
          <TrendingUp className="h-3 w-3" />
          Across {activePolicies} active{" "}
          {activePolicies === 1 ? "policy" : "policies"}
        </p>
      </div>

      <div className="bg-muted/30 rounded-xl border p-5">
        <div className="text-muted-foreground mb-2 flex items-center gap-2 text-sm">
          <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
            <Shield className="text-primary h-4 w-4" />
          </div>
          <p className="font-medium">Policy Count</p>
        </div>
        <p className="font-currency text-foreground text-2xl font-bold">
          {totalPolicies}
        </p>
        {inactivePolicies > 0 && (
          <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            {inactivePolicies} inactive/lapsed{" "}
            {inactivePolicies === 1 ? "policy" : "policies"}
          </p>
        )}
      </div>
    </div>
  );
}
