"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  User,
  Calendar,
  MapPin,
  Heart,
  Cigarette,
  FileText,
  Download,
  DollarSign,
  Clock,
  Shield,
} from "lucide-react";
import type { Client } from "@/types/client";
import type { Asset } from "@/types/asset";
import type { Debt } from "@/types/debt";
import type { InsuranceNeedsResult } from "@/lib/hooks/use-insurance-needs";
import {
  calculateAge,
  calculateAssetTotals,
  formatCurrency,
  formatDate,
  formatDateTime,
} from "@/lib/client-utils";
import { useInsuranceNeeds } from "@/lib/hooks/use-insurance-needs";
import {
  InsuranceNeedsCard,
  InsuranceNeedsChart,
} from "@/components/clients/insurance-needs";
import { AssetsSummary } from "@/components/clients/assets-summary";
import { DebtsSummary } from "@/components/clients/debts-summary";
import { AISummaryCard } from "@/components/clients/ai-summary-card";
import { NetWorthProjectionChart } from "@/components/clients/charts/net-worth-projection-chart";
import { TaxBurdenChart } from "@/components/clients/charts/tax-burden-chart";
import { LiquidityAnalysisChart } from "@/components/clients/charts/liquidity-analysis-chart";
import { BeneficiaryDistributionChart } from "@/components/clients/charts/beneficiary-distribution-chart";
import { AssetDiversificationChart } from "@/components/clients/charts/asset-diversification-chart";
import { DebtAmortizationChart } from "@/components/clients/charts/debt-amortization-chart";
import { GoalsProgressChart } from "@/components/clients/charts/goals-progress-chart";

/** Default settling costs fallback when no insurance result is available */
const DEFAULT_SETTLING_COSTS = 15000;

interface ClientReportViewProps {
  client: Client;
  clientId: string;
  /** API URL that returns the generated PDF document */
  pdfDownloadUrl?: string;
  /** Pre-loaded assets for demo mode (skips API fetch) */
  demoAssets?: Asset[];
  /** Pre-loaded debts for demo mode (skips API fetch) */
  demoDebts?: Debt[];
  /** Pre-loaded insurance result for demo mode (skips calculation) */
  demoInsuranceResult?: InsuranceNeedsResult;
  /** Pre-generated AI letter for demo mode (skips API call) */
  demoLetter?: string;
}

/**
 * Read-only report view for a client's financial needs analysis.
 * Displays client snapshot, financial summary, and insurance needs breakdown
 * in a print-friendly format without edit controls.
 *
 * Supports demo mode when demoAssets, demoDebts, and demoInsuranceResult are provided.
 */
export function ClientReportView({
  client,
  clientId,
  pdfDownloadUrl,
  demoAssets,
  demoDebts,
  demoInsuranceResult,
  demoLetter,
}: ClientReportViewProps) {
  const isDemo = !!(demoAssets && demoDebts && demoInsuranceResult);
  const [assets, setAssets] = useState<Asset[]>(demoAssets || []);
  const [debts, setDebts] = useState<Debt[]>(demoDebts || []);
  const [isLoadingData, setIsLoadingData] = useState(!isDemo);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Insurance needs calculation (skipped in demo mode)
  const {
    result: calculatedResult,
    isLoading: isInsuranceLoading,
    error: insuranceError,
    recalculate: recalculateInsurance,
    calculatedAt: insuranceCalculatedAt,
  } = useInsuranceNeeds({
    clientId,
    enabled: !!client && !isDemo,
  });

  // Use demo result or calculated result
  const insuranceResult = demoInsuranceResult || calculatedResult;

  // Fetch assets and debts in parallel (skipped in demo mode)
  useEffect(() => {
    if (isDemo) return;

    async function fetchData() {
      setIsLoadingData(true);
      try {
        const [assetsResponse, debtsResponse] = await Promise.all([
          fetch(`/api/clients/${clientId}/assets`, { credentials: "include" }),
          fetch(`/api/clients/${clientId}/debts`, { credentials: "include" }),
        ]);

        if (assetsResponse.ok) {
          const data = await assetsResponse.json();
          const assetsList =
            data.items ||
            data.assets ||
            data.data ||
            (Array.isArray(data) ? data : []);
          setAssets(assetsList);
        }

        if (debtsResponse.ok) {
          const data = await debtsResponse.json();
          const debtsList =
            data.items ||
            data.debts ||
            data.data ||
            (Array.isArray(data) ? data : []);
          setDebts(debtsList);
        }
      } catch {
        // Silently handle error - summary will show $0
      } finally {
        setIsLoadingData(false);
      }
    }
    fetchData();
  }, [clientId, isDemo]);

  // Calculate totals using shared utility
  const { total: totalAssets } = calculateAssetTotals(assets);

  // Calculate total debts
  const totalDebts = debts.reduce(
    (sum, d) => sum + Number(d.currentBalance),
    0,
  );

  const handleDownloadPdf = async () => {
    if (!pdfDownloadUrl || isDownloadingPdf) return;

    try {
      setIsDownloadingPdf(true);
      const response = await fetch(pdfDownloadUrl, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to generate report PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${client.firstName.toLowerCase()}-${client.lastName.toLowerCase()}-report.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Generate initials for avatar
  const initials =
    `${client.firstName.charAt(0)}${client.lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="space-y-8 print:space-y-4">
      {/* Report Header */}
      <Card className="border-border/60 overflow-hidden py-0 shadow-sm print:border-gray-300 print:shadow-none">
        {/* Use explicit deep navy color for consistent branding across themes */}
        <div className="relative bg-[oklch(0.35_0.08_250)] px-6 py-6 print:bg-gray-100">
          {/* Decorative elements */}
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-white/5 blur-xl" />
          <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-white/5 blur-xl" />

          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              {/* Client avatar */}
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 text-xl font-semibold text-white backdrop-blur-sm">
                {initials}
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <h2 className="font-display text-2xl font-semibold tracking-tight text-white print:text-xl print:text-gray-900">
                    {client.firstName} {client.lastName}
                  </h2>
                  {isDemo && (
                    <Badge
                      variant="secondary"
                      className="border-white/20 bg-white/10 text-white"
                    >
                      Demo
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-white/70 print:text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Financial Needs Analysis
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDateTime(new Date().toISOString())}
                  </span>
                </div>
              </div>
            </div>
            {pdfDownloadUrl && (
              <Button
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                variant="secondary"
                className="border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 print:hidden"
              >
                <Download className="mr-2 h-4 w-4" />
                {isDownloadingPdf ? "Preparing PDF..." : "Download PDF"}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Client Profile */}
      <Card className="border-border/60 shadow-sm print:border-gray-300 print:shadow-none">
        <CardHeader className="pb-4 print:pb-2">
          <div className="flex items-center gap-3">
            <div className="bg-primary/5 flex h-10 w-10 items-center justify-center rounded-lg">
              <User className="text-primary h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Client Profile</CardTitle>
              <CardDescription>
                Personal and demographic information
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3 print:grid-cols-3">
            <div className="flex items-start gap-3">
              <Calendar className="text-muted-foreground mt-0.5 h-4 w-4" />
              <div>
                <p className="text-muted-foreground text-sm">Age</p>
                <p className="font-medium">
                  {calculateAge(client.dateOfBirth)} years
                  <span className="text-muted-foreground ml-1 text-sm font-normal">
                    (DOB: {formatDate(client.dateOfBirth)})
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="text-muted-foreground mt-0.5 h-4 w-4" />
              <div>
                <p className="text-muted-foreground text-sm">State</p>
                <p className="font-medium tracking-wide uppercase">
                  {client.state}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="text-muted-foreground mt-0.5 h-4 w-4" />
              <div>
                <p className="text-muted-foreground text-sm">Sex</p>
                <p className="font-medium">
                  {client.sex === "M"
                    ? "Male"
                    : client.sex === "F"
                      ? "Female"
                      : "Not specified"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Cigarette className="text-muted-foreground mt-0.5 h-4 w-4" />
              <div>
                <p className="text-muted-foreground text-sm">Smoker Status</p>
                <Badge
                  variant={client.smoker ? "destructive" : "outline"}
                  className={
                    client.smoker
                      ? ""
                      : "border-emerald/30 bg-emerald/5 text-emerald"
                  }
                >
                  {client.smoker ? "Smoker" : "Non-Smoker"}
                </Badge>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Heart className="text-muted-foreground mt-0.5 h-4 w-4" />
              <div>
                <p className="text-muted-foreground text-sm">Health Rating</p>
                <Badge variant="outline" className="capitalize">
                  {client.healthRating || "Standard"}
                </Badge>
              </div>
            </div>

            {client.hasSpouse && (
              <div className="flex items-start gap-3">
                <User className="text-muted-foreground mt-0.5 h-4 w-4" />
                <div>
                  <p className="text-muted-foreground text-sm">Spouse Age</p>
                  <p className="font-medium">
                    {client.spouseAge
                      ? `${client.spouseAge} years`
                      : "Not specified"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Financial Inputs Summary */}
      <Card className="border-border/60 shadow-sm print:border-gray-300 print:shadow-none">
        <CardHeader className="pb-4 print:pb-2">
          <div className="flex items-center gap-3">
            <div className="bg-primary/5 flex h-10 w-10 items-center justify-center rounded-lg">
              <DollarSign className="text-primary h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Financial Inputs</CardTitle>
              <CardDescription>
                Income and insurance planning parameters
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
            <div className="bg-muted/30 rounded-xl border p-4 print:p-2">
              <p className="text-muted-foreground text-sm">
                Client Annual Income
              </p>
              <p className="font-currency mt-1 text-xl font-semibold">
                {formatCurrency(parseFloat(client.clientIncome || "0") || 0)}
              </p>
            </div>

            {client.spouseIncome && parseFloat(client.spouseIncome) > 0 && (
              <div className="bg-muted/30 rounded-xl border p-4 print:p-2">
                <p className="text-muted-foreground text-sm">
                  Spouse Annual Income
                </p>
                <p className="font-currency mt-1 text-xl font-semibold">
                  {formatCurrency(parseFloat(client.spouseIncome) || 0)}
                </p>
              </div>
            )}

            <div className="bg-muted/30 rounded-xl border p-4 print:p-2">
              <p className="text-muted-foreground text-sm">
                Income Replacement
              </p>
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

          {client.additionalGoals && (
            <div className="border-border/60 mt-6 border-t pt-4">
              <p className="text-muted-foreground mb-2 text-sm font-medium">
                Additional Goals & Notes
              </p>
              <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                {client.additionalGoals}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assets & Debts Summary */}
      <Card className="border-border/60 shadow-sm print:border-gray-300 print:shadow-none">
        <CardHeader className="pb-4 print:pb-2">
          <div className="flex items-center gap-3">
            <div className="bg-primary/5 flex h-10 w-10 items-center justify-center rounded-lg">
              <Shield className="text-primary h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Net Worth Summary</CardTitle>
              <CardDescription>
                Assets, liabilities, and net position
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      {/* Insurance Needs Analysis */}
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
            isLoading={!isDemo && isInsuranceLoading}
            error={isDemo ? null : insuranceError}
            onRecalculate={isDemo ? undefined : recalculateInsurance}
            calculatedAt={
              isDemo ? new Date().toISOString() : insuranceCalculatedAt
            }
            isReadOnly={isDemo}
          />
          <InsuranceNeedsChart
            result={insuranceResult}
            isLoading={!isDemo && isInsuranceLoading}
          />
        </div>
      </div>

      {/* AI Recommendation Letter */}
      <div className="print:break-before-page">
        <AISummaryCard clientId={clientId} demoLetter={demoLetter} />
      </div>

      {/* Interactive Charts Section */}
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
          settlingCosts={
            insuranceResult?.estateBufferNeeds || DEFAULT_SETTLING_COSTS
          }
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <AssetDiversificationChart assets={assets} />

          <BeneficiaryDistributionChart
            assets={assets}
            debts={totalDebts}
            settlingCosts={
              insuranceResult?.estateBufferNeeds || DEFAULT_SETTLING_COSTS
            }
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
                  .filter((a) =>
                    ["checking", "savings", "emergency_fund"].includes(a.type),
                  )
                  .reduce((sum, a) => sum + (Number(a.currentValue) || 0), 0),
              },
            ]}
          />
        </div>
      </div>

      {/* Report Footer */}
      <div className="border-border/60 text-muted-foreground border-t pt-6 text-sm print:pt-2">
        <p className="leading-relaxed">
          This report is generated for informational purposes only and should
          not be considered financial advice. Please consult with a licensed
          financial advisor for personalized recommendations.
        </p>
        <p className="mt-3 font-mono text-xs">
          Report ID: {clientId} | Last Updated:{" "}
          {formatDateTime(client.updatedAt)}
        </p>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for the report view
 */
export function ClientReportViewSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <Card className="border-border/60 overflow-hidden py-0">
        <div className="bg-primary/10 px-6 py-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-14 w-14 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
      </Card>

      {/* Profile skeleton */}
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-4 w-4" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Financial inputs skeleton */}
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Net worth skeleton */}
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-52" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </CardContent>
      </Card>

      {/* Insurance needs skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}
