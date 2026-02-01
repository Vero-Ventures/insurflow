"use client";

import { DollarSign, TrendingUp } from "lucide-react";
import type { Debt } from "@/types/debt";
import { formatCurrency, calculateDebtTotal } from "@/lib/client-utils";

interface DebtsSummaryProps {
  items: Debt[];
  totalAssets?: number;
}

export function DebtsSummary({ items, totalAssets = 0 }: DebtsSummaryProps) {
  const totalDebts = calculateDebtTotal(items);
  const netWorth = totalAssets - totalDebts;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="bg-muted/50 rounded-lg border p-4">
        <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
          <DollarSign className="h-4 w-4" />
          <p>Total Debts</p>
        </div>
        <p className="text-2xl font-bold">{formatCurrency(totalDebts)}</p>
      </div>

      <div
        className={`rounded-lg border p-4 ${
          netWorth >= 0
            ? "bg-green-50 dark:bg-green-950/20"
            : "bg-red-50 dark:bg-red-950/20"
        }`}
      >
        <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4" />
          <p>Net Worth</p>
        </div>
        <p
          className={`text-2xl font-bold ${netWorth >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}
        >
          {formatCurrency(netWorth)}
        </p>
      </div>
    </div>
  );
}
