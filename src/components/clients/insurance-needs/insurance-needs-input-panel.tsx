"use client";

import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/client-utils";
import { cn } from "@/lib/utils";
import type {
  ConfidenceLabel,
  ConfidenceResult,
} from "@/lib/financial/confidence-scoring";
import type { InsuranceNeedsResult } from "@/lib/hooks/use-insurance-needs";

const MAX_CONFIDENCE_REASONS_TO_DISPLAY = 6;

interface InsuranceNeedsInputPanelProps {
  result: InsuranceNeedsResult;
  calculatedAt: string | null;
  confidence?: ConfidenceResult | null;
}

function getConfidenceStyles(label: ConfidenceLabel) {
  switch (label) {
    case "High":
      return {
        container: "border-emerald/30 bg-emerald/5",
        badge: "border-emerald/30 bg-emerald/10 text-emerald",
      };
    case "Medium":
      return {
        container: "border-amber/30 bg-amber/5",
        badge: "border-amber/30 bg-amber/10 text-amber-700",
      };
    case "Low":
    default:
      return {
        container: "border-destructive/30 bg-destructive/5",
        badge: "border-destructive/30 bg-destructive/10 text-destructive",
      };
  }
}

export function InsuranceNeedsInputPanel({
  result,
  calculatedAt,
  confidence,
}: InsuranceNeedsInputPanelProps) {
  return (
    <>
      {calculatedAt && (
        <p className="text-muted-foreground text-sm">
          Calculated: {formatDateTime(calculatedAt)}
        </p>
      )}

      {confidence && (
        <div
          className={cn(
            "rounded-xl border p-4",
            getConfidenceStyles(confidence.label).container,
          )}
        >
          <h4 className="text-foreground mb-2 text-sm font-semibold">
            Confidence in this estimate
          </h4>

          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "font-medium",
                getConfidenceStyles(confidence.label).badge,
              )}
            >
              {confidence.label}
            </Badge>

            <span className="text-muted-foreground text-sm">
              Score: {confidence.score}/100
            </span>
          </div>

          <p className="text-muted-foreground mb-3 text-xs">
            Confidence reflects how complete your data is and whether we used
            default assumptions. Higher scores mean the estimate is based more
            on your actual inputs.
          </p>

          {confidence.label !== "High" && (
            <div className="text-muted-foreground mb-2 text-xs">
              Confidence is reduced due to missing inputs or default
              assumptions:
            </div>
          )}

          {confidence.reasons.length > 0 && confidence.label !== "High" && (
            <ul className="text-muted-foreground list-inside list-disc space-y-0.5 text-xs">
              {confidence.reasons
                .slice(0, MAX_CONFIDENCE_REASONS_TO_DISPLAY)
                .map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
            </ul>
          )}

          {confidence.label === "High" && (
            <p className="text-muted-foreground text-xs">
              Your key inputs are complete and the estimate uses minimal
              defaults.
            </p>
          )}
        </div>
      )}

      {(result.inputsUsed.clientIncome > 0 ||
        result.inputsUsed.spouseIncome > 0) && (
        <div className="border-border/60 text-muted-foreground border-t pt-4 text-xs">
          <p className="font-medium">Calculation Summary:</p>
          <ul className="mt-1.5 space-y-0.5">
            <li>
              Client Income: {formatCurrency(result.inputsUsed.clientIncome)}
              {result.inputsUsed.includeSpouseIncome &&
                result.inputsUsed.spouseIncome > 0 && (
                  <>
                    {" "}
                    + Spouse: {formatCurrency(result.inputsUsed.spouseIncome)}
                  </>
                )}
            </li>
          </ul>
        </div>
      )}
    </>
  );
}
