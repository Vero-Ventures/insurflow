import { Briefcase, Heart } from "lucide-react";
import { formatCurrency } from "@/lib/client-utils";
import { cn } from "@/lib/utils";
import type { USSettlingRequirementsResult } from "@/lib/hooks/use-settling-requirements";
import { SettlingRequirementsMetricBox } from "./settling-requirements-metric-box";
import { SettlingRequirementsJurisdictionBreakdown } from "./settling-requirements-jurisdiction-breakdown";

interface SettlingRequirementsResultsProps {
  result: USSettlingRequirementsResult;
}

export function SettlingRequirementsResults({
  result,
}: SettlingRequirementsResultsProps) {
  const {
    professionalFees,
    funeralExpenses,
    totalSettlingRequirements,
    notes,
    inputsUsed,
  } = result;

  return (
    <>
      <SettlingRequirementsJurisdictionBreakdown result={result} />

      <div>
        <h4 className="text-foreground mb-3 text-sm font-semibold">
          Professional Fees & Expenses
        </h4>
        <div className="grid gap-3 md:grid-cols-2">
          <SettlingRequirementsMetricBox
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
          </SettlingRequirementsMetricBox>
          <SettlingRequirementsMetricBox
            icon={Heart}
            iconBgClass="bg-insurance/10"
            iconClass="text-insurance"
            label="Funeral Expenses"
            value={funeralExpenses}
            description="Estimated funeral & burial costs"
          />
        </div>
      </div>

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
    </>
  );
}
