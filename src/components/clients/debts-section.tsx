"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DebtsList, type Debt } from "./debts-list";
import { DebtForm } from "./debt-form";

interface DebtsSectionProps {
  clientId: string;
  totalAssets?: number;
}

export function DebtsSection({ clientId, totalAssets = 0 }: DebtsSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [totalDebts, setTotalDebts] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch debts to calculate totals
  useEffect(() => {
    const fetchDebts = async () => {
      try {
        const response = await fetch(`/api/clients/${clientId}/debts`);
        if (response.ok) {
          const data = await response.json();
          const allDebts = data.debts || [];

          // Calculate total debts
          const total = allDebts.reduce((sum: number, debt: Debt) => {
            const balance =
              typeof debt.currentBalance === "string"
                ? parseFloat(debt.currentBalance)
                : debt.currentBalance;
            return sum + (isNaN(balance) ? 0 : balance);
          }, 0);

          setTotalDebts(total);
        }
      } catch (error) {
        console.error("Error fetching debts:", error);
      }
    };

    fetchDebts();
  }, [clientId, refreshKey]);

  const handleEdit = (debt: Debt) => {
    setSelectedDebt(debt);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setSelectedDebt(null);
    setIsFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    if (!open) {
      setSelectedDebt(null);
    }
    setIsFormOpen(open);
  };

  const handleDebtSaved = useCallback(() => {
    // Force list refresh by updating key
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleDebtDeleted = useCallback(() => {
    // Force list refresh
    setRefreshKey((prev) => prev + 1);
  }, []);

  const calculateNetWorth = (): number => {
    return totalAssets - totalDebts;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Debts & Liabilities</CardTitle>
              <CardDescription>
                Track and manage all client liabilities
              </CardDescription>
            </div>
            <Button onClick={handleAddNew} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Debt
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Debts List */}
          <DebtsList
            key={refreshKey}
            clientId={clientId}
            onEdit={handleEdit}
            onDebtDeleted={handleDebtDeleted}
          />

          {/* Summary Section */}
          <div className="border-t pt-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="bg-muted/50 rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">Total Debts</p>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat("en-CA", {
                    style: "currency",
                    currency: "CAD",
                  }).format(totalDebts)}
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">Total Assets</p>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat("en-CA", {
                    style: "currency",
                    currency: "CAD",
                  }).format(totalAssets)}
                </p>
              </div>

              <div className="rounded-lg border bg-blue-50 p-4 dark:bg-blue-950">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Net Worth
                </p>
                <p
                  className={`text-2xl font-bold ${
                    calculateNetWorth() >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {new Intl.NumberFormat("en-CA", {
                    style: "currency",
                    currency: "CAD",
                  }).format(calculateNetWorth())}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debt Form Dialog */}
      <DebtForm
        clientId={clientId}
        debt={selectedDebt}
        isOpen={isFormOpen}
        onOpenChange={handleFormClose}
        onSaved={handleDebtSaved}
      />
    </>
  );
}
