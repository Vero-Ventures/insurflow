import { DollarSign } from "lucide-react";
import type { Client } from "@/types/client";
import { formatCurrency } from "@/lib/client-utils";
import { ClientReportSection } from "./client-report-section";

interface ClientReportFinancialInputsSectionProps {
  client: Client;
}

export function ClientReportFinancialInputsSection({
  client,
}: ClientReportFinancialInputsSectionProps) {
  return (
    <ClientReportSection
      title="Financial Inputs"
      description="Income and insurance planning parameters"
      icon={<DollarSign className="text-primary h-5 w-5" />}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
        <div className="bg-muted/30 rounded-xl border p-4 print:p-2">
          <p className="text-muted-foreground text-sm">Client Annual Income</p>
          <p className="font-currency mt-1 text-xl font-semibold">
            {formatCurrency(parseFloat(client.clientIncome || "0") || 0)}
          </p>
        </div>

        {client.spouseIncome && parseFloat(client.spouseIncome) > 0 ? (
          <div className="bg-muted/30 rounded-xl border p-4 print:p-2">
            <p className="text-muted-foreground text-sm">
              Spouse Annual Income
            </p>
            <p className="font-currency mt-1 text-xl font-semibold">
              {formatCurrency(parseFloat(client.spouseIncome) || 0)}
            </p>
          </div>
        ) : null}

        <div className="bg-muted/30 rounded-xl border p-4 print:p-2">
          <p className="text-muted-foreground text-sm">Income Replacement</p>
          <p className="font-currency mt-1 text-xl font-semibold">
            {client.incomeReplacementPercent || "70"}%
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            for {client.replacementDurationYears || 10} years
          </p>
        </div>

        <div className="bg-muted/30 rounded-xl border p-4 print:p-2">
          <p className="text-muted-foreground text-sm">
            Existing Life Insurance
          </p>
          <p className="font-currency mt-1 text-xl font-semibold">
            {formatCurrency(
              parseFloat(client.existingLifeInsuranceCoverage || "0") || 0,
            )}
          </p>
        </div>
      </div>

      {client.additionalGoals ? (
        <div className="border-border/60 mt-6 border-t pt-4">
          <p className="text-muted-foreground mb-2 text-sm font-medium">
            Additional Goals & Notes
          </p>
          <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
            {client.additionalGoals}
          </p>
        </div>
      ) : null}
    </ClientReportSection>
  );
}
