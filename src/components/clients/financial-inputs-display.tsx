"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  DollarSign,
  Users,
  Percent,
  Clock,
  Shield,
  FileText,
  Pencil,
} from "lucide-react";
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
  const clientIncome = parseFloat(client.clientIncome || "0") || 0;
  const spouseIncome = parseFloat(client.spouseIncome || "0") || 0;
  const existingCoverage =
    parseFloat(client.existingLifeInsuranceCoverage || "0") || 0;

  return (
    <Card className="border-border/60 overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <DollarSign className="text-primary h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold tracking-tight">
                Financial Inputs
              </h3>
              <CardDescription>
                Income, assets, debts, and financial planning details
              </CardDescription>
            </div>
          </div>
          <Button
            onClick={onEdit}
            variant="outline"
            size="sm"
            className="border-border/60 gap-2"
          >
            <Pencil className="h-4 w-4" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Client Income */}
          <div className="group border-border/60 relative overflow-hidden rounded-xl border p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                <DollarSign className="text-primary h-4 w-4" />
              </div>
              <span className="text-muted-foreground text-sm font-medium">
                Client Income (Annual)
              </span>
            </div>
            <p className="font-currency text-xl font-semibold tracking-tight">
              {formatCurrency(clientIncome)}
            </p>
          </div>

          {/* Spouse Income */}
          {spouseIncome > 0 && (
            <div className="group border-border/60 relative overflow-hidden rounded-xl border p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                  <Users className="text-primary h-4 w-4" />
                </div>
                <span className="text-muted-foreground text-sm font-medium">
                  Spouse Income (Annual)
                </span>
              </div>
              <p className="font-currency text-xl font-semibold tracking-tight">
                {formatCurrency(spouseIncome)}
              </p>
            </div>
          )}

          {/* Income Replacement % */}
          <div className="group border-border/60 relative overflow-hidden rounded-xl border p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                <Percent className="text-primary h-4 w-4" />
              </div>
              <span className="text-muted-foreground text-sm font-medium">
                Income Replacement %
              </span>
            </div>
            <p className="font-currency text-xl font-semibold tracking-tight">
              {client.incomeReplacementPercent || "70"}%
            </p>
          </div>

          {/* Replacement Duration */}
          <div className="group border-border/60 relative overflow-hidden rounded-xl border p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                <Clock className="text-primary h-4 w-4" />
              </div>
              <span className="text-muted-foreground text-sm font-medium">
                Replacement Duration
              </span>
            </div>
            <p className="text-xl font-semibold tracking-tight">
              {client.replacementDurationYears || 10}{" "}
              <span className="text-muted-foreground text-sm font-normal">
                years
              </span>
            </p>
          </div>

          {/* Existing Life Insurance */}
          <div className="group border-border/60 relative overflow-hidden rounded-xl border p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                <Shield className="text-primary h-4 w-4" />
              </div>
              <span className="text-muted-foreground text-sm font-medium">
                Existing Life Insurance
              </span>
            </div>
            <p className="font-currency text-xl font-semibold tracking-tight">
              {formatCurrency(existingCoverage)}
            </p>
          </div>
        </div>

        {/* Additional Goals */}
        {client.additionalGoals && (
          <div className="border-border/60 mt-6 rounded-xl border p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                <FileText className="text-primary h-4 w-4" />
              </div>
              <span className="text-muted-foreground text-sm font-medium">
                Additional Goals
              </span>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {client.additionalGoals}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
