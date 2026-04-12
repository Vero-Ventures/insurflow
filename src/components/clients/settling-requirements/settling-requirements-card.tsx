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
import {
  RefreshCw,
  AlertCircle,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { SettlingRequirementsInputs } from "./settling-requirements-inputs";
import { SettlingRequirementsResults } from "./settling-requirements-results";
import { cn } from "@/lib/utils";
import type { USSettlingRequirementsResult } from "@/lib/hooks/use-settling-requirements";

interface SettlingRequirementsCardProps {
  result: USSettlingRequirementsResult | null;
  isLoading: boolean;
  error: string | null;
  onRecalculate?: () => Promise<void>;
  calculatedAt: string | null;
  /** When true, hides action buttons for read-only contexts like reports */
  isReadOnly?: boolean;
}

/**
 * Shared card header component
 */
function SettlingCardHeader({
  icon: Icon,
  iconBgClass,
  iconClass,
  title,
  description,
}: {
  icon: LucideIcon;
  iconBgClass: string;
  iconClass: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg",
          iconBgClass,
        )}
      >
        <Icon className={cn("h-5 w-5", iconClass)} />
      </div>
      <div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
    </div>
  );
}

export function SettlingRequirementsCard({
  result,
  isLoading,
  error,
  onRecalculate,
  calculatedAt,
  isReadOnly = false,
}: SettlingRequirementsCardProps) {
  if (isLoading) {
    return <SettlingRequirementsCardSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <SettlingCardHeader
            icon={FileText}
            iconBgClass="bg-destructive/10"
            iconClass="text-destructive"
            title="Estate Settling Costs"
            description="Error loading settling requirements calculation"
          />
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
          <SettlingCardHeader
            icon={FileText}
            iconBgClass="bg-primary/5"
            iconClass="text-primary"
            title="Estate Settling Costs"
            description="Calculate costs to settle the estate"
          />
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
        <SettlingCardHeader
          icon={FileText}
          iconBgClass="bg-primary/5"
          iconClass="text-primary"
          title="Estate Settling Costs"
          description="Breakdown of costs to settle the estate"
        />
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
        <SettlingRequirementsInputs
          result={result}
          calculatedAt={calculatedAt}
          showHeader
          showSummary={false}
        />
        <SettlingRequirementsResults result={result} />
        <SettlingRequirementsInputs
          result={result}
          calculatedAt={calculatedAt}
          showHeader={false}
          showSummary
        />
      </CardContent>
    </Card>
  );
}

function SettlingRequirementsCardSkeleton() {
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
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>

        {/* Government Fees Skeleton */}
        <div>
          <Skeleton className="mb-3 h-4 w-40" />
          <div className="grid gap-3 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
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

        {/* Professional Fees Skeleton */}
        <div>
          <Skeleton className="mb-3 h-4 w-48" />
          <div className="grid gap-3 md:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-muted/30 rounded-xl border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Skeleton className="h-7 w-7 rounded-lg" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-28" />
                <Skeleton className="mt-2 h-3 w-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Total Skeleton */}
        <div className="bg-muted/30 rounded-xl border p-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="mb-2 h-4 w-44" />
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
