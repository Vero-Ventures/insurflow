import { Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetsSummary } from "@/components/clients/assets-summary";
import { DebtsSummary } from "@/components/clients/debts-summary";
import type { Asset } from "@/types/asset";
import type { Debt } from "@/types/debt";
import { ClientReportSection } from "./client-report-section";

interface ClientReportNetWorthSectionProps {
  assets: Asset[];
  debts: Debt[];
  totalAssets: number;
  isLoadingData: boolean;
}

export function ClientReportNetWorthSection({
  assets,
  debts,
  totalAssets,
  isLoadingData,
}: ClientReportNetWorthSectionProps) {
  return (
    <ClientReportSection
      title="Net Worth Summary"
      description="Assets, liabilities, and net position"
      icon={<Shield className="text-primary h-5 w-5" />}
      contentClassName="space-y-4"
    >
      {isLoadingData ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <>
          <AssetsSummary items={assets} />
          <DebtsSummary items={debts} totalAssets={totalAssets} />
        </>
      )}
    </ClientReportSection>
  );
}
