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
  Printer,
} from "lucide-react";
import type { Client } from "@/types/client";
import type { Asset } from "@/types/asset";
import type { Debt } from "@/types/debt";
import type { InsuranceNeedsResult } from "@/lib/financial/insurance-needs";
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

interface ClientReportViewProps {
  client: Client;
  clientId: string;
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
  demoAssets,
  demoDebts,
  demoInsuranceResult,
  demoLetter,
}: ClientReportViewProps) {
  const isDemo = !!(demoAssets && demoDebts && demoInsuranceResult);
  const [assets, setAssets] = useState<Asset[]>(demoAssets || []);
  const [debts, setDebts] = useState<Debt[]>(demoDebts || []);
  const [isLoadingData, setIsLoadingData] = useState(!isDemo);

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
          fetch(`/api/clients/${clientId}/assets`),
          fetch(`/api/clients/${clientId}/debts`),
        ]);

        if (assetsResponse.ok) {
          const data = await assetsResponse.json();
          setAssets(data.assets || []);
        }

        if (debtsResponse.ok) {
          const data = await debtsResponse.json();
          setDebts(data.debts || []);
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Report Header */}
      <div className="border-b pb-4 print:pb-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              <span>Financial Needs Analysis Report</span>
              {isDemo && (
                <Badge variant="secondary" className="ml-2">
                  Demo
                </Badge>
              )}
            </div>
            <h2 className="text-2xl font-bold print:text-xl">
              {client.firstName} {client.lastName}
            </h2>
            <p className="text-muted-foreground text-sm">
              Generated: {formatDateTime(new Date().toISOString())}
            </p>
          </div>
          <Button
            onClick={handlePrint}
            variant="outline"
            className="print:hidden"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Client Snapshot */}
      <Card className="print:border-gray-300 print:shadow-none">
        <CardHeader className="print:pb-2">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Client Profile
          </CardTitle>
          <CardDescription>
            Personal and demographic information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 print:grid-cols-3">
            <div className="flex items-start gap-3">
              <Calendar className="text-muted-foreground mt-0.5 h-4 w-4" />
              <div>
                <p className="text-muted-foreground text-sm">Age</p>
                <p className="font-medium">
                  {calculateAge(client.dateOfBirth)} years
                  <span className="text-muted-foreground ml-1 text-sm">
                    (DOB: {formatDate(client.dateOfBirth)})
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="text-muted-foreground mt-0.5 h-4 w-4" />
              <div>
                <p className="text-muted-foreground text-sm">State</p>
                <p className="font-medium uppercase">{client.state}</p>
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
                <Badge variant={client.smoker ? "destructive" : "secondary"}>
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
      <Card className="print:border-gray-300 print:shadow-none">
        <CardHeader className="print:pb-2">
          <CardTitle>Financial Inputs</CardTitle>
          <CardDescription>
            Income and insurance planning parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
            <div className="bg-muted/50 rounded-lg border p-4 print:p-2">
              <p className="text-muted-foreground text-sm">
                Client Annual Income
              </p>
              <p className="text-lg font-semibold">
                {formatCurrency(parseFloat(client.clientIncome || "0") || 0)}
              </p>
            </div>

            {client.spouseIncome && parseFloat(client.spouseIncome) > 0 && (
              <div className="bg-muted/50 rounded-lg border p-4 print:p-2">
                <p className="text-muted-foreground text-sm">
                  Spouse Annual Income
                </p>
                <p className="text-lg font-semibold">
                  {formatCurrency(parseFloat(client.spouseIncome) || 0)}
                </p>
              </div>
            )}

            <div className="bg-muted/50 rounded-lg border p-4 print:p-2">
              <p className="text-muted-foreground text-sm">
                Income Replacement
              </p>
              <p className="text-lg font-semibold">
                {client.incomeReplacementPercent || "70"}%
              </p>
              <p className="text-muted-foreground text-xs">
                for {client.replacementDurationYears || 10} years
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg border p-4 print:p-2">
              <p className="text-muted-foreground text-sm">
                Existing Life Insurance
              </p>
              <p className="text-lg font-semibold">
                {formatCurrency(
                  parseFloat(client.existingLifeInsuranceCoverage || "0") || 0,
                )}
              </p>
            </div>
          </div>

          {client.additionalGoals && (
            <div className="mt-4 border-t pt-4">
              <p className="text-muted-foreground mb-1 text-sm">
                Additional Goals & Notes
              </p>
              <p className="text-sm whitespace-pre-wrap">
                {client.additionalGoals}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assets & Debts Summary */}
      <Card className="print:border-gray-300 print:shadow-none">
        <CardHeader className="print:pb-2">
          <CardTitle>Net Worth Summary</CardTitle>
          <CardDescription>
            Assets, liabilities, and net position
          </CardDescription>
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
        <h3 className="mb-4 text-lg font-semibold print:text-base">
          Insurance Needs Analysis
        </h3>
        <div className="grid gap-4 lg:grid-cols-2 print:block print:space-y-4">
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

      {/* Report Footer */}
      <div className="text-muted-foreground border-t pt-4 text-sm print:pt-2">
        <p>
          This report is generated for informational purposes only and should
          not be considered financial advice. Please consult with a licensed
          financial advisor for personalized recommendations.
        </p>
        <p className="mt-2">
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
    <div className="space-y-6">
      <div className="border-b pb-4">
        <Skeleton className="mb-2 h-4 w-48" />
        <Skeleton className="mb-1 h-8 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="mb-2 h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="mb-2 h-4 w-24" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="mb-2 h-6 w-36" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="mb-2 h-6 w-40" />
          <Skeleton className="h-4 w-52" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}
