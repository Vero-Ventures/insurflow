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
  Scale,
  Calculator,
  Landmark,
  Building2,
  Briefcase,
  Heart,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/client-utils";
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

/**
 * Styled metric box for displaying fees/taxes
 */
function MetricBox({
  icon: Icon,
  iconBgClass,
  iconClass,
  label,
  value,
  description,
  children,
}: {
  icon: LucideIcon;
  iconBgClass: string;
  iconClass: string;
  label: string;
  value: number;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-muted/30 rounded-xl border p-4">
      <div className="mb-2 flex items-center gap-2">
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg",
            iconBgClass,
          )}
        >
          <Icon className={cn("h-3.5 w-3.5", iconClass)} />
        </div>
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
      </div>
      <p className="font-currency text-lg font-semibold">
        {formatCurrency(value)}
      </p>
      {children || (
        <p className="text-muted-foreground mt-1 text-xs">{description}</p>
      )}
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

  const {
    probateFees,
    federalEstateTax,
    stateEstateTax,
    finalIncomeTax,
    professionalFees,
    funeralExpenses,
    totalSettlingRequirements,
    notes,
    inputsUsed,
  } = result;

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
        {calculatedAt && (
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Calculated: {formatDateTime(calculatedAt)}
            </p>
            <div className="bg-muted/50 flex items-center gap-1.5 rounded-full px-3 py-1">
              <MapPin className="text-muted-foreground h-3.5 w-3.5" />
              <span className="text-muted-foreground text-xs font-medium">
                {inputsUsed.stateName}
              </span>
            </div>
          </div>
        )}

        {/* Government Fees & Taxes */}
        <div>
          <h4 className="text-foreground mb-3 text-sm font-semibold">
            Government Fees & Taxes
          </h4>
          <div className="grid gap-3 md:grid-cols-2">
            <MetricBox
              icon={Scale}
              iconBgClass="bg-chart-1/10"
              iconClass="text-chart-1"
              label="Probate Fees"
              value={probateFees}
              description={`${inputsUsed.stateName} court costs & fees`}
            />
            <MetricBox
              icon={Calculator}
              iconBgClass="bg-chart-2/10"
              iconClass="text-chart-2"
              label="Final Income Tax"
              value={finalIncomeTax}
              description={`On ${formatCurrency(inputsUsed.finalYearIncome)} income`}
            />
            <MetricBox
              icon={Landmark}
              iconBgClass="bg-chart-3/10"
              iconClass="text-chart-3"
              label="Federal Estate Tax"
              value={federalEstateTax}
              description={
                federalEstateTax === 0
                  ? "Below $13.61M exemption"
                  : "40% on amount over exemption"
              }
            />
            <MetricBox
              icon={Building2}
              iconBgClass="bg-chart-4/10"
              iconClass="text-chart-4"
              label="State Estate Tax"
              value={stateEstateTax}
              description={
                stateEstateTax === 0
                  ? "No state estate/inheritance tax"
                  : `${inputsUsed.stateName} estate/inheritance tax`
              }
            />
          </div>
        </div>

        {/* Professional Fees & Expenses */}
        <div>
          <h4 className="text-foreground mb-3 text-sm font-semibold">
            Professional Fees & Expenses
          </h4>
          <div className="grid gap-3 md:grid-cols-2">
            <MetricBox
              icon={Briefcase}
              iconBgClass="bg-chart-5/10"
              iconClass="text-chart-5"
              label="Professional Fees"
              value={professionalFees.total}
              description=""
            >
              <div className="text-muted-foreground mt-2 space-y-0.5 text-xs">
                <p>Legal: {formatCurrency(professionalFees.legalFees)}</p>
                <p>
                  Accounting: {formatCurrency(professionalFees.accountingFees)}
                </p>
                <p>Executor: {formatCurrency(professionalFees.executorFees)}</p>
              </div>
            </MetricBox>
            <MetricBox
              icon={Heart}
              iconBgClass="bg-insurance/10"
              iconClass="text-insurance"
              label="Funeral Expenses"
              value={funeralExpenses}
              description="Estimated funeral & burial costs"
            />
          </div>
        </div>

        {/* Total Settling Requirements - Emphasized */}
        <div
          className={cn(
            "rounded-xl border p-6",
            "border-primary/20 bg-primary/5",
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary text-sm font-semibold">
                Total Settling Requirements
              </p>
              <p className="font-currency text-primary text-3xl font-bold">
                {formatCurrency(totalSettlingRequirements)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-sm font-medium">
                Estate Value
              </p>
              <p className="font-currency text-xl font-semibold">
                {formatCurrency(inputsUsed.estateValue)}
              </p>
              {inputsUsed.estateValue > 0 && (
                <p className="text-muted-foreground mt-1 text-xs">
                  {(
                    (totalSettlingRequirements / inputsUsed.estateValue) *
                    100
                  ).toFixed(1)}
                  % of estate
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        {notes.length > 0 && (
          <div className="border-border/60 text-muted-foreground border-t pt-4 text-xs">
            <p className="font-medium">Notes:</p>
            <ul className="mt-1.5 list-inside list-disc space-y-0.5">
              {notes.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Data Summary */}
        <div className="border-border/60 text-muted-foreground border-t pt-4 text-xs">
          <p className="font-medium">Calculation Summary:</p>
          <ul className="mt-1.5 space-y-0.5">
            <li>
              State: {inputsUsed.stateName} ({inputsUsed.state})
            </li>
            <li>Estate Value: {formatCurrency(inputsUsed.estateValue)}</li>
            <li>
              Final Year Income: {formatCurrency(inputsUsed.finalYearIncome)}
            </li>
            <li>Assets in Estate: {inputsUsed.assetCount}</li>
          </ul>
        </div>
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
