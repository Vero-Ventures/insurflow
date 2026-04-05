"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import type { Client } from "@/types/client";
import type { Asset } from "@/types/asset";
import type { Debt } from "@/types/debt";
import type { InsuranceNeedsResult } from "@/lib/hooks/use-insurance-needs";
import { calculateAssetTotals } from "@/lib/client-utils";
import { useInsuranceNeeds } from "@/lib/hooks/use-insurance-needs";
import { AISummaryCard } from "@/components/clients/ai-summary-card";
import {
  ClientReportAnalysisSection,
  ClientReportFinancialInputsSection,
  ClientReportFooter,
  ClientReportHeader,
  ClientReportInsuranceSection,
  ClientReportNetWorthSection,
  ClientReportPdfTrigger,
  ClientReportProfileSection,
} from "@/components/clients/report";

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
  /** Called after successful report download */
  onReportDownloaded?: () => void;
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
  onReportDownloaded,
}: ClientReportViewProps) {
  const isDemo = !!(demoAssets && demoDebts && demoInsuranceResult);
  const [assets, setAssets] = useState<Asset[]>(demoAssets || []);
  const [debts, setDebts] = useState<Debt[]>(demoDebts || []);
  const [isLoadingData, setIsLoadingData] = useState(!isDemo);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingPacket, setIsDownloadingPacket] = useState(false);

  // Insurance needs calculation (skipped in demo mode)
  const {
    result: calculatedResult,
    confidence: insuranceConfidence,
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

      // Sanitize filename by removing special characters
      const safeFirstName = client.firstName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      const safeLastName = client.lastName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      anchor.download = `${safeFirstName}-${safeLastName}-report.pdf`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Report downloaded successfully");
      onReportDownloaded?.();
    } catch (error) {
      console.error("Failed to download PDF:", error);
      toast.error("Failed to download report. Please try again.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadCompliancePacket = async () => {
    if (isDownloadingPacket || isDemo) return;

    try {
      setIsDownloadingPacket(true);
      const response = await fetch(
        `/api/clients/${clientId}/compliance-packet`,
        { credentials: "include" },
      );

      if (!response.ok) {
        throw new Error("Failed to generate compliance packet");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;

      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "compliance-packet.pdf";
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch?.[1]) {
          filename = filenameMatch[1];
        }
      }
      anchor.download = filename;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Compliance packet downloaded successfully");
    } catch (error) {
      console.error("Failed to download compliance packet:", error);
      toast.error("Failed to download compliance packet. Please try again.");
    } finally {
      setIsDownloadingPacket(false);
    }
  };

  return (
    <div className="space-y-8 print:space-y-4">
      <ClientReportHeader
        client={client}
        isDemo={isDemo}
        generatedAt={new Date().toISOString()}
        showPdfTrigger={!!pdfDownloadUrl}
        pdfTrigger={
          pdfDownloadUrl ? (
            <ClientReportPdfTrigger
              isDownloading={isDownloadingPdf}
              onDownload={handleDownloadPdf}
              label="Download PDF"
              loadingLabel="Preparing PDF..."
            />
          ) : undefined
        }
        complianceTrigger={
          !isDemo ? (
            <ClientReportPdfTrigger
              isDownloading={isDownloadingPacket}
              onDownload={handleDownloadCompliancePacket}
              label="Compliance Packet"
              loadingLabel="Preparing Packet..."
              icon={<ClipboardCheck className="mr-2 h-4 w-4" />}
            />
          ) : undefined
        }
      />

      <ClientReportProfileSection client={client} />

      <ClientReportFinancialInputsSection client={client} />

      <ClientReportNetWorthSection
        assets={assets}
        debts={debts}
        totalAssets={totalAssets}
        isLoadingData={isLoadingData}
      />

      <ClientReportInsuranceSection
        insuranceResult={insuranceResult ?? null}
        insuranceConfidence={isDemo ? null : insuranceConfidence}
        isDemo={isDemo}
        isInsuranceLoading={isInsuranceLoading}
        insuranceError={isDemo ? null : insuranceError}
        recalculateInsurance={isDemo ? undefined : recalculateInsurance}
        insuranceCalculatedAt={
          isDemo ? new Date().toISOString() : insuranceCalculatedAt
        }
        clientStateCode={client.state}
      />

      {/* AI Recommendation Letter */}
      <div className="print:break-before-page">
        <AISummaryCard clientId={clientId} demoLetter={demoLetter} />
      </div>

      <ClientReportAnalysisSection
        assets={assets}
        debts={debts}
        client={client}
        totalAssets={totalAssets}
        totalDebts={totalDebts}
        settlingCosts={
          insuranceResult?.estateBufferNeeds || DEFAULT_SETTLING_COSTS
        }
      />

      <ClientReportFooter clientId={clientId} updatedAt={client.updatedAt} />
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
