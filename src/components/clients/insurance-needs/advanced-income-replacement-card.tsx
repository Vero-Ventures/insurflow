"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Calculator,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Landmark,
  ShieldCheck,
  PiggyBank,
  Wallet,
  Receipt,
  DollarSign,
  Info,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/client-utils";
import {
  DEFAULT_DISCOUNT_RATE,
  DEFAULT_INFLATION_RATE,
  DEFAULT_EXPENSE_REDUCTION_PERCENT,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type {
  UseAdvancedIncomeReplacementReturn,
  AdvancedIncomeReplacementParams,
} from "@/lib/hooks/use-advanced-income-replacement";
import { IncomeReplacementSchedule } from "./income-replacement-schedule";

// ============================================================================
// Types
// ============================================================================

type DurationScenarioType =
  | "custom"
  | "childTurns18"
  | "retirement"
  | "lifetime";

type CalculationModeType = "income-multiplier" | "expense-based";

interface AdvancedIncomeReplacementCardProps {
  hook: UseAdvancedIncomeReplacementReturn;
  /** Client's youngest child age (pre-filled from DB, null if not set) */
  youngestChildAge?: number | null;
  /** Client's retirement age (pre-filled from DB, null if not set) */
  retirementAge?: number | null;
  /** Client's current age */
  currentAge?: number;
  /** Client has a spouse */
  hasSpouse?: boolean;
  /** When true, hides action buttons for read-only contexts */
  isReadOnly?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function AdvancedIncomeReplacementCard({
  hook,
  youngestChildAge,
  retirementAge,
  currentAge,
  hasSpouse: _hasSpouse = false,
  isReadOnly = false,
}: AdvancedIncomeReplacementCardProps) {
  const {
    result,
    isLoading,
    error,
    calculate,
    calculatedAt,
    mode,
    calculationMetadata,
  } = hook;

  // --- Local form state (scenario selector + advanced params) ---------------
  const [scenario, setScenario] = useState<DurationScenarioType>("custom");
  const [customYears, setCustomYears] = useState(10);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [inflationRate, setInflationRate] = useState(
    DEFAULT_INFLATION_RATE * 100,
  );
  const [discountRate, setDiscountRate] = useState(DEFAULT_DISCOUNT_RATE * 100);

  // --- Calculation mode state -----------------------------------------------
  const [calculationMode, setCalculationMode] =
    useState<CalculationModeType>("income-multiplier");
  const [annualExpenses, setAnnualExpenses] = useState(60000);
  const [expenseReductionPercent, setExpenseReductionPercent] = useState(
    DEFAULT_EXPENSE_REDUCTION_PERCENT * 100,
  );

  // --- Handlers -------------------------------------------------------------
  const handleCalculate = () => {
    const params: AdvancedIncomeReplacementParams = {
      durationScenario: scenario,
      inflationRate: inflationRate / 100,
      discountRate: discountRate / 100,
    };
    if (scenario === "custom") {
      params.customDurationYears = customYears;
    }

    // Add mode configuration
    if (calculationMode === "expense-based") {
      params.modeConfig = {
        mode: "expense-based",
        annualExpenses,
        expenseReductionPercent: expenseReductionPercent / 100,
      };
    } else {
      // For income-multiplier, let the API use client defaults
      params.modeConfig = {
        mode: "income-multiplier",
      };
    }

    calculate(params);
  };

  // --- Render ---------------------------------------------------------------

  if (isLoading && !result) {
    return <AdvancedIncomeReplacementSkeleton />;
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/5 flex h-10 w-10 items-center justify-center rounded-lg">
            <TrendingUp className="text-primary h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">
              Advanced Income Replacement
            </CardTitle>
            <CardDescription>
              PV-adjusted income replacement with inflation &amp; survivor
              resources
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ---- Error Banner ---- */}
        {error && (
          <div className="border-destructive/20 bg-destructive/5 flex flex-col gap-3 rounded-xl border p-4">
            <div className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Calculation Failed</span>
            </div>
            <p className="text-destructive/80 text-sm">{error}</p>
          </div>
        )}

        {/* ---- Scenario Selector ---- */}
        {!isReadOnly && (
          <div className="space-y-4">
            {/* Calculation Mode Selection */}
            <div className="space-y-2">
              <Label htmlFor="calculation-mode">Calculation Method</Label>
              <Select
                value={calculationMode}
                onValueChange={(v) =>
                  setCalculationMode(v as CalculationModeType)
                }
              >
                <SelectTrigger id="calculation-mode" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income-multiplier">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span>Income Multiplier (Traditional)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="expense-based">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      <span>Expense-Based (Realistic)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                {calculationMode === "expense-based"
                  ? "Uses actual household expenses, adjusted for post-death reduction"
                  : "Uses a percentage of gross income (e.g., 70%)"}
              </p>
            </div>

            {/* Expense-Based Mode Inputs */}
            {calculationMode === "expense-based" && (
              <div className="border-border/60 bg-muted/20 grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="annual-expenses">
                    Annual Household Expenses ($)
                  </Label>
                  <Input
                    id="annual-expenses"
                    type="number"
                    min={0}
                    value={annualExpenses}
                    onChange={(e) =>
                      setAnnualExpenses(
                        Math.max(0, parseInt(e.target.value) || 0),
                      )
                    }
                  />
                  <p className="text-muted-foreground text-xs">
                    Total yearly expenses (housing, food, utilities, etc.)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-reduction">
                    Post-Death Reduction (%)
                  </Label>
                  <Input
                    id="expense-reduction"
                    type="number"
                    min={0}
                    max={100}
                    value={expenseReductionPercent}
                    onChange={(e) =>
                      setExpenseReductionPercent(
                        Math.max(
                          0,
                          Math.min(100, parseInt(e.target.value) || 0),
                        ),
                      )
                    }
                  />
                  <p className="text-muted-foreground text-xs">
                    Typically 15-25% (one fewer person)
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="duration-scenario">Duration Scenario</Label>
                <Select
                  value={scenario}
                  onValueChange={(v) => setScenario(v as DurationScenarioType)}
                >
                  <SelectTrigger id="duration-scenario" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom Duration</SelectItem>
                    <SelectItem value="childTurns18">
                      Until Youngest Child Turns 18
                      {youngestChildAge != null &&
                        /* Clamp to 0 — mirrors backend resolveDuration() */
                        ` (${Math.max(0, 18 - youngestChildAge)} yrs)`}
                    </SelectItem>
                    <SelectItem value="retirement">
                      Until Retirement
                      {retirementAge != null &&
                        currentAge != null &&
                        /* Clamp to 0 — mirrors backend resolveDuration() */
                        ` (${Math.max(0, retirementAge - currentAge)} yrs)`}
                    </SelectItem>
                    <SelectItem value="lifetime">
                      Lifetime
                      {currentAge != null && ` (to age 95)`}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {scenario === "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="custom-years">Years</Label>
                  <Input
                    id="custom-years"
                    type="number"
                    min={1}
                    max={80}
                    value={customYears}
                    onChange={(e) =>
                      setCustomYears(
                        Math.max(
                          1,
                          Math.min(80, parseInt(e.target.value) || 1),
                        ),
                      )
                    }
                  />
                </div>
              )}
            </div>

            {/* Advanced toggleable params */}
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground -ml-2 gap-1.5 text-xs"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                Advanced Parameters
              </Button>

              {showAdvanced && (
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="inflation-rate">Inflation Rate (%)</Label>
                    <Input
                      id="inflation-rate"
                      type="number"
                      min={0}
                      max={50}
                      step={0.1}
                      value={inflationRate}
                      onChange={(e) =>
                        setInflationRate(parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount-rate">Discount Rate (%)</Label>
                    <Input
                      id="discount-rate"
                      type="number"
                      min={0}
                      max={50}
                      step={0.1}
                      value={discountRate}
                      onChange={(e) =>
                        setDiscountRate(parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={handleCalculate}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Calculator className="mr-2 h-4 w-4" />
              )}
              {result ? "Recalculate" : "Calculate"}
            </Button>
          </div>
        )}

        {/* ---- Results ---- */}
        {result && (
          <div className="space-y-6">
            {calculatedAt && (
              <p className="text-muted-foreground text-sm">
                Calculated: {formatDateTime(calculatedAt)}
              </p>
            )}

            {/* PV Summary Cards */}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="bg-muted/30 rounded-xl border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <div className="bg-chart-1/10 flex h-7 w-7 items-center justify-center rounded-lg">
                    <Wallet className="text-chart-1 h-3.5 w-3.5" />
                  </div>
                  <p className="text-muted-foreground text-sm font-medium">
                    Gross Income PV
                  </p>
                </div>
                <p className="font-currency text-lg font-semibold">
                  {formatCurrency(result.presentValueTotal)}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {result.durationYears} years, inflation-adjusted
                </p>
              </div>

              <div className="bg-muted/30 rounded-xl border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <div className="bg-chart-3/10 flex h-7 w-7 items-center justify-center rounded-lg">
                    <Landmark className="text-chart-3 h-3.5 w-3.5" />
                  </div>
                  <p className="text-muted-foreground text-sm font-medium">
                    Survivor Resources PV
                  </p>
                </div>
                <p className="font-currency text-lg font-semibold">
                  {formatCurrency(result.survivorResourcesPV)}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Govt benefits, insurance &amp; income
                </p>
              </div>

              <div className="bg-muted/30 rounded-xl border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <div className="bg-chart-5/10 flex h-7 w-7 items-center justify-center rounded-lg">
                    <ShieldCheck className="text-chart-5 h-3.5 w-3.5" />
                  </div>
                  <p className="text-muted-foreground text-sm font-medium">
                    Net Coverage Gap PV
                  </p>
                </div>
                <p className="font-currency text-lg font-semibold">
                  {formatCurrency(result.netCoverageNeededPV)}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Additional coverage recommended
                </p>
              </div>
            </div>

            {/* Net Coverage Emphasis */}
            <div
              className={cn(
                "rounded-xl border p-6",
                result.netCoverageNeededPV > 0
                  ? "border-primary/20 bg-primary/5"
                  : "border-green-500/20 bg-green-500/5",
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      result.netCoverageNeededPV > 0
                        ? "text-primary"
                        : "text-green-600",
                    )}
                  >
                    Net Income Replacement Need
                  </p>
                  <p
                    className={cn(
                      "font-currency text-3xl font-bold",
                      result.netCoverageNeededPV > 0
                        ? "text-primary"
                        : "text-green-600",
                    )}
                  >
                    {formatCurrency(result.netCoverageNeededPV)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground text-sm font-medium">
                    Duration
                  </p>
                  <p className="text-foreground text-xl font-semibold">
                    {result.durationYears} years
                  </p>
                </div>
              </div>
              {result.netCoverageNeededPV === 0 && (
                <p className="mt-3 text-sm font-medium text-green-600">
                  Survivor resources fully cover income replacement needs
                </p>
              )}
            </div>

            {/* Resolved Inputs Summary */}
            <div className="border-border/60 text-muted-foreground space-y-1 border-t pt-4 text-xs">
              <div className="mb-2 flex items-center gap-2">
                <p className="font-medium">Parameters Used:</p>
                {mode && (
                  <Badge
                    variant={mode === "expense-based" ? "secondary" : "outline"}
                    className="text-xs"
                  >
                    {mode === "expense-based" ? (
                      <>
                        <Receipt className="mr-1 h-3 w-3" />
                        Expense-Based
                      </>
                    ) : (
                      <>
                        <DollarSign className="mr-1 h-3 w-3" />
                        Income-Multiplier
                      </>
                    )}
                  </Badge>
                )}
              </div>
              <ul className="mt-1.5 grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
                {/* Show mode-specific inputs */}
                {result.resolvedInputs.mode === "expense-based" ? (
                  <>
                    <li>
                      Annual Expenses:{" "}
                      {formatCurrency(
                        result.resolvedInputs.annualExpenses ?? 0,
                      )}
                    </li>
                    <li>
                      Expense Reduction:{" "}
                      {(
                        (result.resolvedInputs.expenseReductionPercent ?? 0) *
                        100
                      ).toFixed(0)}
                      %
                    </li>
                    <li>
                      Adjusted Annual Need:{" "}
                      {formatCurrency(
                        result.resolvedInputs.annualBaselineNeed ?? 0,
                      )}
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      Base Income:{" "}
                      {formatCurrency(
                        result.resolvedInputs.baseAnnualIncome ?? 0,
                      )}
                    </li>
                    <li>
                      Replacement Ratio:{" "}
                      {(
                        (result.resolvedInputs.replacementRatio ?? 0.7) * 100
                      ).toFixed(0)}
                      %
                    </li>
                  </>
                )}
                <li>
                  Inflation:{" "}
                  {(result.resolvedInputs.inflationRate * 100).toFixed(1)}%
                </li>
                <li>
                  Discount:{" "}
                  {(result.resolvedInputs.discountRate * 100).toFixed(1)}%
                </li>
                {result.resolvedInputs.survivorResources.govSurvivorBenefit >
                  0 && (
                  <li>
                    Govt Benefit:{" "}
                    {formatCurrency(
                      result.resolvedInputs.survivorResources
                        .govSurvivorBenefit,
                    )}
                    /yr
                  </li>
                )}
                {result.resolvedInputs.survivorResources.existingInsurance >
                  0 && (
                  <li>
                    Existing Insurance:{" "}
                    {formatCurrency(
                      result.resolvedInputs.survivorResources.existingInsurance,
                    )}
                  </li>
                )}
              </ul>

              {/* Assumptions tooltip */}
              {calculationMetadata && (
                <div className="border-border/40 bg-muted/20 mt-3 rounded-lg border p-3">
                  <div className="text-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium">
                    <Info className="h-3.5 w-3.5" />
                    Calculation Assumptions
                  </div>
                  <p className="text-muted-foreground mb-2">
                    {calculationMetadata.modeDescription}
                  </p>
                  <ul className="text-muted-foreground list-inside list-disc space-y-0.5">
                    {calculationMetadata.assumptions
                      .slice(0, 4)
                      .map((assumption, i) => (
                        <li key={i}>{assumption}</li>
                      ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Year-by-Year Schedule (collapsible) */}
            <IncomeReplacementSchedule schedule={result.annualSchedule} />
          </div>
        )}

        {/* No result yet, and not loading */}
        {!result && !isLoading && !error && (
          <div className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
            <PiggyBank className="h-4 w-4" />
            Select a scenario and click Calculate to see results.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Skeleton
// ============================================================================

function AdvancedIncomeReplacementSkeleton() {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-4 w-80" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
        <Skeleton className="h-9 w-28" />
      </CardContent>
    </Card>
  );
}
