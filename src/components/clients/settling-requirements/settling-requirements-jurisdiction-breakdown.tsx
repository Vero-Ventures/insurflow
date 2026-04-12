import { Calculator, Landmark, Scale, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/client-utils";
import type { USSettlingRequirementsResult } from "@/lib/hooks/use-settling-requirements";
import { SettlingRequirementsMetricBox } from "./settling-requirements-metric-box";

interface SettlingRequirementsJurisdictionBreakdownProps {
  result: USSettlingRequirementsResult;
}

export function SettlingRequirementsJurisdictionBreakdown({
  result,
}: SettlingRequirementsJurisdictionBreakdownProps) {
  const {
    probateFees,
    federalEstateTax,
    stateEstateTax,
    finalIncomeTax,
    inputsUsed,
  } = result;

  return (
    <div>
      <h4 className="text-foreground mb-3 text-sm font-semibold">
        Government Fees & Taxes
      </h4>
      <div className="grid gap-3 md:grid-cols-2">
        <SettlingRequirementsMetricBox
          icon={Scale}
          iconBgClass="bg-chart-1/10"
          iconClass="text-chart-1"
          label="Probate Fees"
          value={probateFees}
          description={`${inputsUsed.stateName} court costs & fees`}
        />
        <SettlingRequirementsMetricBox
          icon={Calculator}
          iconBgClass="bg-chart-2/10"
          iconClass="text-chart-2"
          label="Final Income Tax"
          value={finalIncomeTax}
          description={`On ${formatCurrency(inputsUsed.finalYearIncome)} income`}
        />
        <SettlingRequirementsMetricBox
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
        <SettlingRequirementsMetricBox
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
  );
}
