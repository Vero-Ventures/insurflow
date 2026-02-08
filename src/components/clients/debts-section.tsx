"use client";

import { useCallback, useMemo, useState } from "react";
import { GenericCrudSection } from "@/components/crud/generic-crud-section";
import { DebtsList } from "@/components/clients/debts-list";
import { DebtForm } from "@/components/clients/debt-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/constants";
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  Scale,
  Wallet,
  Building2,
} from "lucide-react";
import type { Debt } from "@/types/debt";

interface DebtsSectionProps {
  clientId: string;
  totalAssets?: number;
}

export function DebtsSection({ clientId, totalAssets = 0 }: DebtsSectionProps) {
  const [debts, setDebts] = useState<Debt[]>([]);

  const handleDebtsChange = useCallback((debts: Debt[]) => {
    setDebts(debts);
  }, []);

  const totalDebts = useMemo(() => {
    return debts.reduce((sum, debt) => {
      const balance =
        typeof debt.currentBalance === "string"
          ? parseFloat(debt.currentBalance)
          : debt.currentBalance;
      return sum + (isNaN(balance) ? 0 : balance);
    }, 0);
  }, [debts]);

  const netWorth = useMemo(() => {
    return totalAssets - totalDebts;
  }, [totalAssets, totalDebts]);

  const isPositiveNetWorth = netWorth >= 0;

  return (
    <>
      <GenericCrudSection<Debt>
        config={{
          title: "Debts",
          itemName: "Debt",
          description: "Track and manage client liabilities",
          createButtonLabel: "Add Debt",
          fetchEndpoint: `/api/clients/${clientId}/debts`,
          emptyMessage: "No debts recorded.",
          icon: CreditCard,
        }}
        ListComponent={DebtsList}
        FormComponent={DebtForm}
        clientId={clientId}
        onItemsChange={handleDebtsChange}
      />

      {/* Net Worth Summary */}
      <Card className="border-border/60 overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <Scale className="text-primary h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold tracking-tight">
                Financial Summary
              </h3>
              <CardDescription>
                Overview of assets, debts, and net worth
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Total Assets */}
            <div className="group border-border/60 relative overflow-hidden rounded-xl border bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 p-5 transition-all hover:border-emerald-200/60 hover:shadow-sm dark:from-emerald-950/20 dark:to-emerald-900/10 dark:hover:border-emerald-800/40">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                  <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Total Assets
                </span>
              </div>
              <p className="font-currency text-2xl font-bold tracking-tight text-emerald-900 dark:text-emerald-100">
                {formatCurrency(totalAssets)}
              </p>
              <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-emerald-200/20 blur-2xl transition-all group-hover:bg-emerald-200/30 dark:bg-emerald-500/10" />
            </div>

            {/* Total Debts */}
            <div className="group border-border/60 relative overflow-hidden rounded-xl border bg-gradient-to-br from-red-50/50 to-red-100/30 p-5 transition-all hover:border-red-200/60 hover:shadow-sm dark:from-red-950/20 dark:to-red-900/10 dark:hover:border-red-800/40">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/40">
                  <Building2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <span className="text-sm font-medium text-red-700 dark:text-red-300">
                  Total Debts
                </span>
              </div>
              <p className="font-currency text-2xl font-bold tracking-tight text-red-900 dark:text-red-100">
                {formatCurrency(totalDebts)}
              </p>
              <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-red-200/20 blur-2xl transition-all group-hover:bg-red-200/30 dark:bg-red-500/10" />
            </div>

            {/* Net Worth */}
            <div
              className={`group relative overflow-hidden rounded-xl border p-5 transition-all hover:shadow-sm ${
                isPositiveNetWorth
                  ? "border-emerald-200/60 bg-gradient-to-br from-emerald-100/60 to-emerald-200/40 hover:border-emerald-300/70 dark:border-emerald-800/40 dark:from-emerald-900/30 dark:to-emerald-800/20 dark:hover:border-emerald-700/50"
                  : "border-red-200/60 bg-gradient-to-br from-red-100/60 to-red-200/40 hover:border-red-300/70 dark:border-red-800/40 dark:from-red-900/30 dark:to-red-800/20 dark:hover:border-red-700/50"
              }`}
            >
              <div className="mb-3 flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    isPositiveNetWorth
                      ? "bg-emerald-200 dark:bg-emerald-800/50"
                      : "bg-red-200 dark:bg-red-800/50"
                  }`}
                >
                  {isPositiveNetWorth ? (
                    <TrendingUp className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-700 dark:text-red-300" />
                  )}
                </div>
                <span
                  className={`text-sm font-medium ${
                    isPositiveNetWorth
                      ? "text-emerald-800 dark:text-emerald-200"
                      : "text-red-800 dark:text-red-200"
                  }`}
                >
                  Net Worth
                </span>
              </div>
              <p
                className={`font-currency text-2xl font-bold tracking-tight ${
                  isPositiveNetWorth
                    ? "text-emerald-900 dark:text-emerald-50"
                    : "text-red-900 dark:text-red-50"
                }`}
              >
                {formatCurrency(netWorth)}
              </p>
              <div
                className={`absolute -top-4 -right-4 h-24 w-24 rounded-full blur-2xl transition-all ${
                  isPositiveNetWorth
                    ? "bg-emerald-300/30 group-hover:bg-emerald-300/40 dark:bg-emerald-400/15"
                    : "bg-red-300/30 group-hover:bg-red-300/40 dark:bg-red-400/15"
                }`}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
