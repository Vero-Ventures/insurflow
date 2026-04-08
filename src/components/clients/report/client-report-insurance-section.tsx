import type { InsuranceNeedsResult } from "@/lib/hooks/use-insurance-needs";
import type { ConfidenceResult } from "@/lib/financial/confidence-scoring";
import {
  InsuranceNeedsCard,
  InsuranceNeedsChart,
} from "@/components/clients/insurance-needs";

interface ClientReportInsuranceSectionProps {
  insuranceResult: InsuranceNeedsResult | null;
  insuranceConfidence: ConfidenceResult | null;
  isDemo: boolean;
  isInsuranceLoading: boolean;
  insuranceError: string | null;
  recalculateInsurance?: () => Promise<void>;
  insuranceCalculatedAt: string | null;
  clientStateCode: string;
}

export function ClientReportInsuranceSection({
  insuranceResult,
  insuranceConfidence,
  isDemo,
  isInsuranceLoading,
  insuranceError,
  recalculateInsurance,
  insuranceCalculatedAt,
  clientStateCode,
}: ClientReportInsuranceSectionProps) {
  return (
    <div className="print:break-before-page">
      <div className="mb-6 flex items-center gap-3">
        <div className="bg-emerald h-1 w-1 rounded-full" />
        <h3 className="font-display text-foreground text-xl font-semibold tracking-tight print:text-base">
          Insurance Needs Analysis
        </h3>
      </div>
      <div className="grid gap-6 lg:grid-cols-2 print:block print:space-y-4">
        <InsuranceNeedsCard
          result={insuranceResult}
          confidence={isDemo ? null : insuranceConfidence}
          isLoading={!isDemo && isInsuranceLoading}
          error={isDemo ? null : insuranceError}
          onRecalculate={isDemo ? undefined : recalculateInsurance}
          calculatedAt={
            isDemo ? new Date().toISOString() : insuranceCalculatedAt
          }
          isReadOnly={isDemo}
          clientStateCode={clientStateCode}
        />
        <InsuranceNeedsChart
          result={insuranceResult}
          isLoading={!isDemo && isInsuranceLoading}
        />
      </div>
    </div>
  );
}
