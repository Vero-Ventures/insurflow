import { AssetDiversificationChart } from "@/components/clients/charts/asset-diversification-chart";
import { BeneficiaryDistributionChart } from "@/components/clients/charts/beneficiary-distribution-chart";
import { DebtAmortizationChart } from "@/components/clients/charts/debt-amortization-chart";
import { GoalsProgressChart } from "@/components/clients/charts/goals-progress-chart";
import { LiquidityAnalysisChart } from "@/components/clients/charts/liquidity-analysis-chart";
import { NetWorthProjectionChart } from "@/components/clients/charts/net-worth-projection-chart";
import { TaxBurdenChart } from "@/components/clients/charts/tax-burden-chart";
import type { Asset } from "@/types/asset";
import type { Client } from "@/types/client";
import type { Debt } from "@/types/debt";

interface ClientReportAnalysisSectionProps {
  assets: Asset[];
  debts: Debt[];
  client: Client;
  totalAssets: number;
  totalDebts: number;
  settlingCosts: number;
}

export function ClientReportAnalysisSection({
  assets,
  debts,
  client,
  totalAssets,
  totalDebts,
  settlingCosts,
}: ClientReportAnalysisSectionProps) {
  return (
    <div className="space-y-6 print:hidden">
      <h3 className="font-display text-foreground text-xl font-semibold tracking-tight">
        Financial Analysis & Projections
      </h3>

      <div className="grid gap-6 lg:grid-cols-2">
        <NetWorthProjectionChart
          assets={assets}
          debts={debts}
          clientIncome={Number(client.clientIncome || 0)}
        />

        <TaxBurdenChart assets={assets} state={client.state} />
      </div>

      <LiquidityAnalysisChart
        assets={assets}
        debts={debts}
        settlingCosts={settlingCosts}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <AssetDiversificationChart assets={assets} />

        <BeneficiaryDistributionChart
          assets={assets}
          debts={totalDebts}
          settlingCosts={settlingCosts}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DebtAmortizationChart debts={debts} />

        <GoalsProgressChart
          goals={[
            {
              name: "Children's Education",
              targetAmount: 100000,
              currentFunding: client.clientIncome
                ? Number(client.clientIncome) * 0.1
                : 0,
            },
            {
              name: "Retirement Savings",
              targetAmount: 2000000,
              currentFunding: totalAssets * 0.6,
            },
            {
              name: "Emergency Fund",
              targetAmount: 50000,
              currentFunding: assets
                .filter((asset) =>
                  ["checking", "savings", "emergency_fund"].includes(
                    asset.type,
                  ),
                )
                .reduce(
                  (sum, asset) => sum + (Number(asset.currentValue) || 0),
                  0,
                ),
            },
          ]}
        />
      </div>
    </div>
  );
}
