"use client";

import { useCallback, useMemo, useState } from "react";
import { GenericCrudSection } from "@/components/crud/generic-crud-section";
import { DebtsListRefactored } from "@/components/clients/debts-list-refactored";
import { DebtFormRefactored } from "@/components/clients/debt-form-refactored";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Debt } from "@/types/debt";

interface DebtsSectionRefactoredProps {
  clientId: string;
  totalAssets?: number;
}

export function DebtsSectionRefactored({
  clientId,
  totalAssets = 0,
}: DebtsSectionRefactoredProps) {
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
          description: "Track and manage client liabilities",
          createButtonLabel: "Add Debt",
          fetchEndpoint: `/api/clients/${clientId}/debts`,
          emptyMessage: "No debts recorded.",
        }}
        ListComponent={DebtsListRefactored}
        FormComponent={DebtFormRefactored}
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
                {new Intl.NumberFormat("en-CA", {
                  style: "currency",
                  currency: "CAD",
                }).format(totalAssets)}
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">Total Debts</p>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat("en-CA", {
                  style: "currency",
                  currency: "CAD",
                }).format(totalDebts)}
              </p>
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
                {new Intl.NumberFormat("en-CA", {
                  style: "currency",
                  currency: "CAD",
                }).format(netWorth)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
