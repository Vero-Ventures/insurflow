"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DollarSign,
  Users,
  Percent,
  Clock,
  Shield,
  FileText,
  Loader2,
  Save,
  X,
} from "lucide-react";
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
    <Card className="border-border/60 overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
            <DollarSign className="text-primary h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold tracking-tight">
              Edit Financial Inputs
            </h3>
            <CardDescription>
              Update income, replacement assumptions, and additional goals
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Client Income */}
          <div className="space-y-2">
            <Label
              htmlFor="clientIncome"
              className="flex items-center gap-2 text-sm font-medium"
            >
              <DollarSign className="text-muted-foreground h-4 w-4" />
              Client Annual Income
            </Label>
            <div className="relative">
              <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                $
              </span>
              <Input
                id="clientIncome"
                type="number"
                step="0.01"
                min="0"
                value={formData.clientIncome}
                onChange={(e) => onInputChange("clientIncome", e.target.value)}
                placeholder="0.00"
                className="border-border/60 font-currency pl-7"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Spouse Income */}
          <div className="space-y-2">
            <Label
              htmlFor="spouseIncome"
              className="flex items-center gap-2 text-sm font-medium"
            >
              <Users className="text-muted-foreground h-4 w-4" />
              Spouse Annual Income
            </Label>
            <div className="relative">
              <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                $
              </span>
              <Input
                id="spouseIncome"
                type="number"
                step="0.01"
                min="0"
                value={formData.spouseIncome}
                onChange={(e) => onInputChange("spouseIncome", e.target.value)}
                placeholder="0.00"
                className="border-border/60 font-currency pl-7"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Income Replacement % */}
          <div className="space-y-2">
            <Label
              htmlFor="incomeReplacementPercent"
              className="flex items-center gap-2 text-sm font-medium"
            >
              <Percent className="text-muted-foreground h-4 w-4" />
              Income Replacement %
            </Label>
            <div className="relative">
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
                className="border-border/60 font-currency pr-8"
                disabled={isSaving}
              />
              <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2">
                %
              </span>
            </div>
          </div>

          {/* Replacement Duration */}
          <div className="space-y-2">
            <Label
              htmlFor="replacementDurationYears"
              className="flex items-center gap-2 text-sm font-medium"
            >
              <Clock className="text-muted-foreground h-4 w-4" />
              Replacement Duration
            </Label>
            <div className="relative">
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
                className="border-border/60 pr-14"
                disabled={isSaving}
              />
              <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                years
              </span>
            </div>
          </div>

          {/* Existing Life Insurance */}
          <div className="space-y-2 md:col-span-2">
            <Label
              htmlFor="existingLifeInsuranceCoverage"
              className="flex items-center gap-2 text-sm font-medium"
            >
              <Shield className="text-muted-foreground h-4 w-4" />
              Existing Life Insurance Coverage
            </Label>
            <div className="relative max-w-md">
              <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                $
              </span>
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
                className="border-border/60 font-currency pl-7"
                disabled={isSaving}
              />
            </div>
          </div>
        </div>

        {/* Additional Goals */}
        <div className="mt-6 space-y-2">
          <Label
            htmlFor="additionalGoals"
            className="flex items-center gap-2 text-sm font-medium"
          >
            <FileText className="text-muted-foreground h-4 w-4" />
            Additional Goals (Optional)
          </Label>
          <Textarea
            id="additionalGoals"
            value={formData.additionalGoals}
            onChange={(e) => onInputChange("additionalGoals", e.target.value)}
            placeholder="Enter any additional financial goals or notes..."
            className="border-border/60 min-h-32 resize-none"
            maxLength={2000}
            disabled={isSaving}
          />
          <p className="text-muted-foreground text-xs">
            {formData.additionalGoals.length}/2000 characters
          </p>
        </div>

        {/* Action Buttons */}
        <div className="border-border/60 mt-8 flex gap-3 border-t pt-6">
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90 flex-1 shadow-sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Financial Inputs
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
            className="border-border/60 flex-1"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
