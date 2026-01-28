"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Client } from "@/types/client";
import { formatCurrency } from "@/lib/client-utils";

interface FinancialInputsDisplayProps {
  client: Client;
  onEdit: () => void;
}

/**
 * Read-only display of financial inputs for a client
 */
export function FinancialInputsDisplay({
  client,
  onEdit,
}: FinancialInputsDisplayProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Inputs</CardTitle>
        <CardDescription>
          Income, assets, debts, and financial planning details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-sm">
              Client Income (Annual)
            </p>
            <p className="font-medium">
              {client.clientIncome
                ? formatCurrency(parseFloat(client.clientIncome))
                : "$0.00"}
            </p>
          </div>
          {client.spouseIncome && (
            <div>
              <p className="text-muted-foreground text-sm">
                Spouse Income (Annual)
              </p>
              <p className="font-medium">
                {formatCurrency(parseFloat(client.spouseIncome))}
              </p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground text-sm">
              Income Replacement %
            </p>
            <p className="font-medium">
              {client.incomeReplacementPercent || "70"}%
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">
              Replacement Duration (Years)
            </p>
            <p className="font-medium">
              {client.replacementDurationYears || 10}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">
              Existing Life Insurance Coverage
            </p>
            <p className="font-medium">
              {client.existingLifeInsuranceCoverage
                ? formatCurrency(
                    parseFloat(client.existingLifeInsuranceCoverage),
                  )
                : "$0.00"}
            </p>
          </div>
        </div>

        {client.additionalGoals && (
          <div>
            <p className="text-muted-foreground text-sm">Additional Goals</p>
            <p className="font-medium whitespace-pre-wrap">
              {client.additionalGoals}
            </p>
          </div>
        )}

        <Button onClick={onEdit}>Edit Financial Inputs</Button>
      </CardContent>
    </Card>
  );
}
