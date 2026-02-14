"use client";

import { useCallback, useEffect, useState } from "react";
import { GenericCrudSection } from "@/components/crud/generic-crud-section";
import { BeneficiariesList } from "@/components/clients/beneficiaries-list";
import { BeneficiaryForm } from "@/components/clients/beneficiary-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  RefreshCw,
  HelpCircle,
} from "lucide-react";
import type { Beneficiary, GapAnalysisSummary } from "@/types/beneficiary";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ASSET_TYPE_LABELS, type AssetType } from "@/lib/validation/asset";

interface BeneficiariesSectionProps {
  clientId: string;
}

export function BeneficiariesSection({ clientId }: BeneficiariesSectionProps) {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysisSummary | null>(
    null,
  );
  const [isLoadingGaps, setIsLoadingGaps] = useState(false);

  const handleBeneficiariesChange = useCallback((items: Beneficiary[]) => {
    setBeneficiaries(items);
  }, []);

  const fetchGapAnalysis = useCallback(async () => {
    try {
      setIsLoadingGaps(true);
      const response = await fetch(`/api/clients/${clientId}/gap-analysis`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setGapAnalysis(data);
      }
    } catch {
      // Gap analysis is optional, don't show error
    } finally {
      setIsLoadingGaps(false);
    }
  }, [clientId]);

  // Fetch gap analysis when beneficiaries change
  useEffect(() => {
    if (beneficiaries.length > 0) {
      fetchGapAnalysis();
    } else {
      setGapAnalysis(null);
    }
  }, [beneficiaries.length, fetchGapAnalysis]);

  return (
    <>
      <GenericCrudSection<Beneficiary>
        config={{
          title: "Beneficiaries",
          itemName: "Beneficiary",
          description:
            "Manage client beneficiaries for estate and insurance planning",
          createButtonLabel: "Add Beneficiary",
          fetchEndpoint: `/api/clients/${clientId}/beneficiaries`,
          emptyMessage:
            "No beneficiaries found. Add beneficiaries to track asset allocations.",
          icon: Users,
        }}
        ListComponent={BeneficiariesList}
        FormComponent={BeneficiaryForm}
        clientId={clientId}
        onItemsChange={handleBeneficiariesChange}
      />

      {/* Gap Analysis Summary Card */}
      {beneficiaries.length > 0 && (
        <GapAnalysisCard
          gapAnalysis={gapAnalysis}
          isLoading={isLoadingGaps}
          onRefresh={fetchGapAnalysis}
        />
      )}
    </>
  );
}

interface GapAnalysisCardProps {
  gapAnalysis: GapAnalysisSummary | null;
  isLoading: boolean;
  onRefresh: () => void;
}

function GapAnalysisCard({
  gapAnalysis,
  isLoading,
  onRefresh,
}: GapAnalysisCardProps) {
  if (isLoading) {
    return (
      <Card className="border-border/60 overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <PieChart className="text-primary h-5 w-5" />
            </div>
            <div>
              <Skeleton className="mb-2 h-5 w-40" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!gapAnalysis || gapAnalysis.totalAssets === 0) {
    return (
      <Card className="border-border/60 overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                <PieChart className="text-primary h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold tracking-tight">
                  Beneficiary Gap Analysis
                </h3>
                <CardDescription>
                  Add assets to see allocation analysis
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            No assets found. Add assets in the Profile tab to analyze
            beneficiary allocations.
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasGaps = gapAnalysis.assetsWithGaps > 0;
  const hasUnallocated = gapAnalysis.unallocatedAssets > 0;
  const hasOverAllocated = gapAnalysis.overAllocatedAssets > 0;
  const hasIssues = hasGaps || hasUnallocated || hasOverAllocated;

  return (
    <Card className="border-border/60 overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                hasIssues
                  ? "bg-amber-100 dark:bg-amber-900/40"
                  : "bg-emerald-100 dark:bg-emerald-900/40"
              }`}
            >
              {hasIssues ? (
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-semibold tracking-tight">
                  Beneficiary Gap Analysis
                </h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="text-muted-foreground h-4 w-4 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        Gap analysis compares desired beneficiary allocations
                        (what the client wants) vs actual designations (what is
                        currently on file with each asset).
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <CardDescription>
                {hasIssues
                  ? "Some assets have allocation mismatches that need attention"
                  : "All asset allocations match desired designations"}
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid gap-4 md:grid-cols-4">
          {/* Total Assets */}
          <div className="rounded-xl border bg-gradient-to-br from-slate-50/50 to-slate-100/30 p-5 dark:from-slate-950/20 dark:to-slate-900/10">
            <p className="text-muted-foreground mb-1 text-sm">Total Assets</p>
            <p className="text-2xl font-bold">{gapAnalysis.totalAssets}</p>
          </div>

          {/* Assets Without Gaps */}
          <div className="rounded-xl border bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 p-5 dark:from-emerald-950/20 dark:to-emerald-900/10">
            <p className="mb-1 text-sm text-emerald-700 dark:text-emerald-300">
              Properly Allocated
            </p>
            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
              {gapAnalysis.assetsWithoutGaps}
            </p>
          </div>

          {/* Unallocated Assets */}
          <div
            className={`rounded-xl border p-5 ${
              hasUnallocated
                ? "bg-gradient-to-br from-amber-50/50 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-900/10"
                : "bg-gradient-to-br from-slate-50/50 to-slate-100/30 dark:from-slate-950/20 dark:to-slate-900/10"
            }`}
          >
            <div className="mb-1 flex items-center gap-2">
              <p
                className={`text-sm ${
                  hasUnallocated
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-muted-foreground"
                }`}
              >
                Unallocated
              </p>
              {hasUnallocated && (
                <Badge variant="outline" className="text-xs">
                  Needs Review
                </Badge>
              )}
            </div>
            <p
              className={`text-2xl font-bold ${
                hasUnallocated
                  ? "text-amber-900 dark:text-amber-100"
                  : "text-foreground"
              }`}
            >
              {gapAnalysis.unallocatedAssets}
            </p>
          </div>

          {/* Assets with Gaps */}
          <div
            className={`rounded-xl border p-5 ${
              hasGaps
                ? "bg-gradient-to-br from-red-50/50 to-red-100/30 dark:from-red-950/20 dark:to-red-900/10"
                : "bg-gradient-to-br from-slate-50/50 to-slate-100/30 dark:from-slate-950/20 dark:to-slate-900/10"
            }`}
          >
            <div className="mb-1 flex items-center gap-2">
              <p
                className={`text-sm ${
                  hasGaps
                    ? "text-red-700 dark:text-red-300"
                    : "text-muted-foreground"
                }`}
              >
                Mismatched
              </p>
              {hasGaps && (
                <Badge variant="destructive" className="text-xs">
                  Action Needed
                </Badge>
              )}
            </div>
            <p
              className={`text-2xl font-bold ${
                hasGaps ? "text-red-900 dark:text-red-100" : "text-foreground"
              }`}
            >
              {gapAnalysis.assetsWithGaps}
            </p>
          </div>
        </div>

        {/* Detailed Asset List with Gaps */}
        {gapAnalysis.assetAnalysis.length > 0 && (
          <div className="mt-6 space-y-3">
            <h4 className="text-sm font-medium">Asset Allocation Details</h4>
            <div className="space-y-2">
              {gapAnalysis.assetAnalysis.map((asset) => (
                <div
                  key={asset.assetId}
                  className={`rounded-lg border p-3 ${
                    asset.hasGap
                      ? "border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-950/20"
                      : asset.allocations.length === 0
                        ? "border-slate-200 bg-slate-50/50 dark:border-slate-800/40 dark:bg-slate-950/20"
                        : "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-950/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{asset.assetName}</span>
                      <Badge variant="outline" className="text-xs">
                        {ASSET_TYPE_LABELS[asset.assetType as AssetType] ||
                          asset.assetType}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">
                        Desired: {asset.totalDesiredPercent.toFixed(0)}%
                      </span>
                      <span className="text-muted-foreground">
                        Actual: {asset.totalActualPercent.toFixed(0)}%
                      </span>
                      {asset.hasGap && (
                        <Badge
                          variant="outline"
                          className="border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                        >
                          Gap: {Math.abs(asset.gapPercent).toFixed(0)}%
                        </Badge>
                      )}
                      {asset.allocations.length === 0 && (
                        <Badge variant="secondary" className="text-xs">
                          No allocations
                        </Badge>
                      )}
                    </div>
                  </div>
                  {asset.allocations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {asset.allocations.map((alloc) => (
                        <span
                          key={alloc.beneficiaryId}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                            alloc.gapPercent !== 0
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {alloc.beneficiaryName}: {alloc.actualPercent}%
                          {alloc.gapPercent !== 0 && (
                            <span className="text-amber-600 dark:text-amber-400">
                              ({alloc.gapPercent > 0 ? "+" : ""}
                              {alloc.gapPercent}%)
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
