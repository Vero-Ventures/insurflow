"use client";

import { useMemo } from "react";
import type { Client } from "@/types/client";
import type { Asset } from "@/types/asset";
import type { Beneficiary, GapAnalysisSummary } from "@/types/beneficiary";
import { buildBeneficiaryTree } from "@/lib/beneficiary-tree/tree-builder";
import { calculateTreeLayout } from "@/lib/beneficiary-tree/layout-calculator";
import type { BeneficiaryTree } from "@/types/beneficiary-tree";

interface UseBeneficiaryTreeLayoutProps {
  client: Client;
  beneficiaries: Beneficiary[];
  assets: Asset[];
  gapAnalysis?: GapAnalysisSummary;
}

/**
 * Hook to calculate tree layout from client data
 */
export function useBeneficiaryTreeLayout({
  client,
  beneficiaries,
  assets,
  gapAnalysis,
}: UseBeneficiaryTreeLayoutProps): BeneficiaryTree | null {
  return useMemo(() => {
    if (beneficiaries.length === 0 || assets.length === 0) {
      return null;
    }

    const { nodes, edges } = buildBeneficiaryTree({
      client,
      beneficiaries,
      assets,
      gapAnalysis,
    });

    return calculateTreeLayout(nodes, edges);
  }, [client, beneficiaries, assets, gapAnalysis]);
}
