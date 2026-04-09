"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Receipt, DollarSign } from "lucide-react";
import type { CalculationModeType } from "./advanced-income-types";

interface AdvancedIncomeModeToggleProps {
  mode: CalculationModeType;
  onChange: (mode: CalculationModeType) => void;
}

export function AdvancedIncomeModeToggle({
  mode,
  onChange,
}: Readonly<AdvancedIncomeModeToggleProps>) {
  return (
    <div className="space-y-2">
      <Label htmlFor="calculation-mode">Calculation Method</Label>
      <Select
        value={mode}
        onValueChange={(v) => onChange(v as CalculationModeType)}
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
        {mode === "expense-based"
          ? "Uses actual household expenses, adjusted for post-death reduction"
          : "Uses a percentage of gross income (e.g., 70%)"}
      </p>
    </div>
  );
}
