"use client";

import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import type { Debt } from "@/types/debt";
import { formatCurrency, calculateDebtTotal } from "@/lib/client-utils";

interface DebtsSummaryProps {
  items: Debt[];
  totalAssets?: number;
}

export function DebtsSummary({ items, totalAssets = 0 }: DebtsSummaryProps) {
  const totalDebts = calculateDebtTotal(items);
  const netWorth = totalAssets - totalDebts;
  const isPositive = netWorth >= 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="bg-muted/30 rounded-xl border p-5">
        <div className="text-muted-foreground mb-2 flex items-center gap-2 text-sm">
          <div className="bg-liability/10 flex h-8 w-8 items-center justify-center rounded-lg">
            <DollarSign className="text-liability h-4 w-4" />
          </div>
          <p className="font-medium">Total Debts</p>
        </div>
        <p className="font-currency text-foreground text-2xl font-bold">
          {formatCurrency(totalDebts)}
        </p>
      </div>

      <div
        className={`rounded-xl border p-5 ${
          isPositive
            ? "border-asset/20 bg-asset/5"
            : "border-liability/20 bg-liability/5"
        }`}
      >
        <div className="text-muted-foreground mb-2 flex items-center gap-2 text-sm">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              isPositive ? "bg-asset/15" : "bg-liability/15"
            }`}
          >
            {isPositive ? (
              <TrendingUp className="text-asset h-4 w-4" />
            ) : (
              <TrendingDown className="text-liability h-4 w-4" />
            )}
          </div>
          <p className="font-medium">Net Worth</p>
        </div>
        <p
          className={`font-currency text-2xl font-bold ${
            isPositive ? "text-asset" : "text-liability"
          }`}
        >
          {formatCurrency(netWorth)}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          Assets minus liabilities
        </p>
      </div>
    </div>
  );
}
