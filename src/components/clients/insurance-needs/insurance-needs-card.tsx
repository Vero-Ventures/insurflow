"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, AlertCircle, Shield } from "lucide-react";
import type { InsuranceNeedsResult } from "@/lib/hooks/use-insurance-needs";
import type { ConfidenceResult } from "@/lib/financial/confidence-scoring";

import { InsuranceNeedsInputPanel } from "./insurance-needs-input-panel";
import { InsuranceNeedsResults } from "./insurance-needs-results";
import { InsuranceNeedsTrace } from "./insurance-needs-trace";

interface InsuranceNeedsCardProps {
  result: InsuranceNeedsResult | null;
  isLoading: boolean;
  error: string | null;
  onRecalculate?: () => Promise<void>;
  calculatedAt: string | null;
  /** Confidence metadata (score, label, reasons); optional when not yet calculated via API */
  confidence?: ConfidenceResult | null;
  /** When true, hides action buttons for read-only contexts like reports */
  isReadOnly?: boolean;
  /** Client state code (e.g., CA) used for state-specific rate table display */
  clientStateCode?: string;
}

export function InsuranceNeedsCard({
  result,
  isLoading,
  error,
  onRecalculate,
  calculatedAt,
  confidence,
  isReadOnly = false,
  clientStateCode,
}: InsuranceNeedsCardProps) {
  if (isLoading) {
    return <InsuranceNeedsCardSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-destructive/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <Shield className="text-destructive h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">
                Insurance Needs Analysis
              </CardTitle>
              <CardDescription>
                Error loading insurance needs calculation
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border-destructive/20 bg-destructive/5 flex flex-col gap-3 rounded-xl border p-4">
            <div className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Calculation Failed</span>
            </div>
            <p className="text-destructive/80 text-sm">{error}</p>
            {!isReadOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRecalculate}
                className="border-destructive/30 text-destructive hover:bg-destructive/10 w-fit"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-primary/5 flex h-10 w-10 items-center justify-center rounded-lg">
              <Shield className="text-primary h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">
                Insurance Needs Analysis
              </CardTitle>
              <CardDescription>
                Calculate recommended insurance coverage
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground py-6 text-center">
            <p className={isReadOnly ? "" : "mb-4"}>
              No calculation available. Please ensure client financial
              information is complete.
            </p>
            {!isReadOnly && (
              <Button onClick={onRecalculate} className="bg-primary">
                <RefreshCw className="mr-2 h-4 w-4" />
                Calculate Now
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/5 flex h-10 w-10 items-center justify-center rounded-lg">
            <Shield className="text-primary h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Insurance Needs Analysis</CardTitle>
            <CardDescription>
              Breakdown of recommended insurance coverage
            </CardDescription>
          </div>
        </div>
        {!isReadOnly && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRecalculate}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Recalculate
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <InsuranceNeedsInputPanel
          result={result}
          calculatedAt={calculatedAt}
          confidence={confidence}
        />

        <InsuranceNeedsResults result={result} />

        <InsuranceNeedsTrace
          result={result}
          clientStateCode={clientStateCode}
        />
      </CardContent>
    </Card>
  );
}

function InsuranceNeedsCardSkeleton() {
  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-9 w-28" />
      </CardHeader>
      <CardContent className="space-y-6">
        <Skeleton className="h-4 w-40" />

        {/* Gross Needs Skeleton */}
        <div>
          <Skeleton className="mb-3 h-4 w-32" />
          <div className="grid gap-3 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-muted/30 rounded-xl border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Skeleton className="h-7 w-7 rounded-lg" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-6 w-28" />
                <Skeleton className="mt-2 h-3 w-32" />
              </div>
            ))}
          </div>
        </div>

        {/* Deductions Skeleton */}
        <div>
          <Skeleton className="mb-3 h-4 w-32" />
          <div className="grid gap-3 md:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-muted/30 rounded-xl border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Skeleton className="h-7 w-7 rounded-lg" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-28" />
              </div>
            ))}
          </div>
        </div>

        {/* Total Skeleton */}
        <div className="bg-muted/30 rounded-xl border p-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="mb-2 h-4 w-36" />
              <Skeleton className="h-9 w-40" />
            </div>
            <div className="text-right">
              <Skeleton className="mb-2 h-4 w-24" />
              <Skeleton className="h-7 w-32" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
