"use client";

import {
  MethodologySection,
  RateTableDisplay,
} from "@/components/transparency";
import type { InsuranceNeedsResult } from "@/lib/hooks/use-insurance-needs";
import { INSURANCE_NEEDS_METHODOLOGY } from "@/lib/transparency/methodology-data";
import { getStateRateTable } from "@/lib/transparency/rate-tables";
import { formatCurrency } from "@/lib/client-utils";

import { CalculationTraceViewer } from "./calculation-trace-viewer";

interface InsuranceNeedsTraceProps {
  result: InsuranceNeedsResult;
  clientStateCode?: string;
}

export function InsuranceNeedsTrace({
  result,
  clientStateCode,
}: InsuranceNeedsTraceProps) {
  return (
    <div className="mt-6 space-y-4 border-t pt-6">
      {result.trace && <CalculationTraceViewer trace={result.trace} />}

      <MethodologySection
        methodology={INSURANCE_NEEDS_METHODOLOGY}
        stepValues={{
          1: {
            value: formatCurrency(result.incomeReplacementNeeds),
          },
          2: {
            value: formatCurrency(result.debtPayoffNeeds),
          },
          3: {
            value: formatCurrency(result.estateBufferNeeds),
          },
          4: {
            value: formatCurrency(result.grossNeeds),
          },
          5: {
            value: formatCurrency(result.totalInsuranceNeeds),
          },
        }}
      />

      {clientStateCode && (
        <RateTableDisplay rateTable={getStateRateTable(clientStateCode)} />
      )}
    </div>
  );
}
