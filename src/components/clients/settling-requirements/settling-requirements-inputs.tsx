import { MapPin } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/client-utils";
import type { USSettlingRequirementsResult } from "@/lib/hooks/use-settling-requirements";

interface SettlingRequirementsInputsProps {
  result: USSettlingRequirementsResult;
  calculatedAt: string | null;
  showHeader?: boolean;
  showSummary?: boolean;
}

export function SettlingRequirementsInputs({
  result,
  calculatedAt,
  showHeader = true,
  showSummary = true,
}: SettlingRequirementsInputsProps) {
  const { inputsUsed } = result;

  return (
    <>
      {showHeader && calculatedAt && (
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

      {showSummary && (
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
      )}
    </>
  );
}
