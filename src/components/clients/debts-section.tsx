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
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/constants";
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
        }}
        ListComponent={DebtsList}
        FormComponent={DebtForm}
        clientId={clientId}
        onItemsChange={handleDebtsChange}
      />

      {/* Net Worth Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
          <CardDescription>
            Overview of assets, debts, and net worth
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-muted/50 rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">Total Assets</p>
              <p className="text-2xl font-bold">
                {formatCurrency(totalAssets)}
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">Total Debts</p>
              <p className="text-2xl font-bold">{formatCurrency(totalDebts)}</p>
            </div>

            <div
              className={`rounded-lg border p-4 ${netWorth >= 0 ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"}`}
            >
              <p
                className={`text-sm ${netWorth >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}
              >
                Net Worth
              </p>
              <p
                className={`text-2xl font-bold ${netWorth >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
              >
                {formatCurrency(netWorth)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
