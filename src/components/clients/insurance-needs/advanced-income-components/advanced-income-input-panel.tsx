"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import {
  DEFAULT_DISCOUNT_RATE,
  DEFAULT_INFLATION_RATE,
  DEFAULT_EXPENSE_REDUCTION_PERCENT,
  DEFAULT_REPLACEMENT_DURATION_YEARS,
} from "@/lib/constants";
import type { AdvancedIncomeReplacementParams } from "@/lib/hooks/use-advanced-income-replacement";
import { AdvancedIncomeModeToggle } from "./advanced-income-mode-toggle";
import type {
  DurationScenarioType,
  CalculationModeType,
} from "./advanced-income-types";

interface AdvancedIncomeInputPanelProps {
  isLoading: boolean;
  resultExists: boolean;
  onCalculate: (params: AdvancedIncomeReplacementParams) => void;
  youngestChildAge?: number | null;
  retirementAge?: number | null;
  currentAge?: number;
}

export function AdvancedIncomeInputPanel({
  isLoading,
  resultExists,
  onCalculate,
  youngestChildAge,
  retirementAge,
  currentAge,
}: Readonly<AdvancedIncomeInputPanelProps>) {
  const clampRatePercent = (value: number) => Math.min(50, Math.max(0, value));

  const [scenario, setScenario] = useState<DurationScenarioType>("custom");
  const [customYears, setCustomYears] = useState(
    DEFAULT_REPLACEMENT_DURATION_YEARS,
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [inflationRate, setInflationRate] = useState(
    DEFAULT_INFLATION_RATE * 100,
  );
  const [discountRate, setDiscountRate] = useState(DEFAULT_DISCOUNT_RATE * 100);

  const [calculationMode, setCalculationMode] =
    useState<CalculationModeType>("income-multiplier");
  const [annualExpenses, setAnnualExpenses] = useState(60000);
  const [expenseReductionPercent, setExpenseReductionPercent] = useState(
    DEFAULT_EXPENSE_REDUCTION_PERCENT * 100,
  );

  const handleCalculate = () => {
    const validatedInflationRate = clampRatePercent(inflationRate);
    const validatedDiscountRate = clampRatePercent(discountRate);

    const params: AdvancedIncomeReplacementParams = {
      durationScenario: scenario,
      inflationRate: validatedInflationRate / 100,
      discountRate: validatedDiscountRate / 100,
    };
    if (scenario === "custom") {
      params.customDurationYears = customYears;
    }

    if (calculationMode === "expense-based") {
      params.modeConfig = {
        mode: "expense-based",
        annualExpenses,
        expenseReductionPercent: expenseReductionPercent / 100,
      };
    } else {
      params.modeConfig = {
        mode: "income-multiplier",
      };
    }

    onCalculate(params);
  };

  return (
    <div className="space-y-4">
      {/* Calculation Mode Selection */}
      <AdvancedIncomeModeToggle
        mode={calculationMode}
        onChange={setCalculationMode}
      />

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
                  Math.max(0, Number.parseInt(e.target.value, 10) || 0),
                )
              }
            />
            <p className="text-muted-foreground text-xs">
              Total yearly expenses (housing, food, utilities, etc.)
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-reduction">Post-Death Reduction (%)</Label>
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
                    Math.min(100, Number.parseFloat(e.target.value) || 0),
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
                  ` (${Math.max(0, 18 - youngestChildAge)} yrs)`}
              </SelectItem>
              <SelectItem value="retirement">
                Until Retirement
                {retirementAge != null &&
                  currentAge != null &&
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
                    Math.min(80, Number.parseInt(e.target.value, 10) || 1),
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
                onChange={(e) => {
                  const parsed = Number.parseFloat(e.target.value);
                  setInflationRate(
                    clampRatePercent(Number.isFinite(parsed) ? parsed : 0),
                  );
                }}
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
                onChange={(e) => {
                  const parsed = Number.parseFloat(e.target.value);
                  setDiscountRate(
                    clampRatePercent(Number.isFinite(parsed) ? parsed : 0),
                  );
                }}
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
        {resultExists ? "Recalculate" : "Calculate"}
      </Button>
    </div>
  );
}
