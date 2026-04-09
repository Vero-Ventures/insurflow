"use client";

import { useCallback, useEffect, useState } from "react";
import { GenericCrudSection } from "@/components/crud/generic-crud-section";
import { BeneficiaryList } from "@/components/clients/beneficiaries-list";
import { BeneficiaryForm } from "@/components/clients/beneficiary-form";
import { Users } from "lucide-react";
import type { Beneficiary, GapAnalysisSummary } from "@/types/beneficiary";
import { BeneficiaryTreeVisualization } from "@/components/clients/beneficiaries/beneficiary-tree-visualization";
import { AllocationSummary } from "@/components/clients/allocation-summary";
import type { Client } from "@/types/client";
import type { Asset } from "@/types/asset";

interface BeneficiariesSectionProps {
  clientId: string;
  client: Client; // Make sure this exists
}

export function BeneficiariesSection({
  clientId,
  client, // Make sure this is destructured
}: BeneficiariesSectionProps) {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysisSummary | null>(
    null,
  );
  const [isLoadingGaps, setIsLoadingGaps] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);

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

  useEffect(() => {
    async function fetchAssets() {
      try {
        const response = await fetch(`/api/clients/${clientId}/assets`, {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          // API returns { items: [...] } via withApiHandler
          setAssets(data.items || data.assets || []);
        }
      } catch (error) {
        // Assets loading is optional, but log error for debugging
        console.error("Failed to fetch assets:", error);
      }
    }
    fetchAssets();
  }, [clientId]);

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
        ListComponent={BeneficiaryList}
        FormComponent={BeneficiaryForm}
        clientId={clientId}
        onItemsChange={handleBeneficiariesChange}
      />

      {/* Gap Analysis Summary Card */}
      {beneficiaries.length > 0 && (
        <AllocationSummary
          gapAnalysis={gapAnalysis}
          isLoading={isLoadingGaps}
          onRefresh={fetchGapAnalysis}
        />
      )}

      {/* Estate Flow Visualization — ADD THIS BLOCK */}
      {beneficiaries.length > 0 && assets.length > 0 && (
        <BeneficiaryTreeVisualization
          client={client}
          beneficiaries={beneficiaries}
          assets={assets}
          gapAnalysis={gapAnalysis ?? undefined}
        />
      )}
    </>
  );
}
