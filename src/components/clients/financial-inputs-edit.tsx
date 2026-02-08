"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { FinancialInputsData } from "@/lib/hooks/use-financial-inputs";

interface FinancialInputsEditProps {
  formData: FinancialInputsData;
  isSaving: boolean;
  onInputChange: (
    field: keyof FinancialInputsData,
    value: string | number,
  ) => void;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * Form for editing financial inputs
 */
export function FinancialInputsEdit({
  formData,
  isSaving,
  onInputChange,
  onSave,
  onCancel,
}: FinancialInputsEditProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Financial Inputs</CardTitle>
        <CardDescription>
          Update income, replacement assumptions, and additional goals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="clientIncome" className="text-sm font-medium">
              Client Annual Income
            </label>
            <Input
              id="clientIncome"
              type="number"
              step="0.01"
              min="0"
              value={formData.clientIncome}
              onChange={(e) => onInputChange("clientIncome", e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="spouseIncome" className="text-sm font-medium">
              Spouse Annual Income
            </label>
            <Input
              id="spouseIncome"
              type="number"
              step="0.01"
              min="0"
              value={formData.spouseIncome}
              onChange={(e) => onInputChange("spouseIncome", e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="incomeReplacementPercent"
              className="text-sm font-medium"
            >
              Income Replacement %
            </label>
            <Input
              id="incomeReplacementPercent"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.incomeReplacementPercent}
              onChange={(e) =>
                onInputChange("incomeReplacementPercent", e.target.value)
              }
              placeholder="70"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="replacementDurationYears"
              className="text-sm font-medium"
            >
              Replacement Duration (Years)
            </label>
            <Input
              id="replacementDurationYears"
              type="number"
              step="1"
              min="0"
              max="50"
              value={formData.replacementDurationYears}
              onChange={(e) => {
                const parsed = parseInt(e.target.value, 10);
                onInputChange(
                  "replacementDurationYears",
                  Number.isNaN(parsed) ? 0 : parsed,
                );
              }}
              placeholder="10"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label
              htmlFor="existingLifeInsuranceCoverage"
              className="text-sm font-medium"
            >
              Existing Life Insurance Coverage
            </label>
            <Input
              id="existingLifeInsuranceCoverage"
              type="number"
              step="0.01"
              min="0"
              value={formData.existingLifeInsuranceCoverage}
              onChange={(e) =>
                onInputChange("existingLifeInsuranceCoverage", e.target.value)
              }
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="additionalGoals" className="text-sm font-medium">
            Additional Goals (Optional)
          </label>
          <Textarea
            id="additionalGoals"
            value={formData.additionalGoals}
            onChange={(e) => onInputChange("additionalGoals", e.target.value)}
            placeholder="Enter any additional financial goals or notes..."
            className="min-h-32"
            maxLength={2000}
          />
          <p className="text-muted-foreground text-xs">
            {formData.additionalGoals.length}/2000 characters
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={onSave} disabled={isSaving} className="flex-1">
            {isSaving ? "Saving..." : "Save Financial Inputs"}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
