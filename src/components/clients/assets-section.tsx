"use client";

import { useCallback } from "react";
import { GenericCrudSection } from "@/components/crud/generic-crud-section";
import { AssetsList } from "@/components/clients/assets-list";
import { AssetForm } from "@/components/clients/asset-form";
import { AssetsSummary } from "@/components/clients/assets-summary";
import { Wallet } from "lucide-react";
import type { Asset } from "@/types/asset";

interface AssetsSectionProps {
  clientId: string;
  onTotalsChange?: (totalAssets: number) => void;
}

export function AssetsSection({
  clientId,
  onTotalsChange,
}: AssetsSectionProps) {
  const handleItemsChange = useCallback(
    (items: Asset[]) => {
      const totalAssets = items.reduce((sum, asset) => {
        const value =
          typeof asset.currentValue === "string"
            ? parseFloat(asset.currentValue)
            : asset.currentValue;
        return sum + (isNaN(value) ? 0 : value);
      }, 0);

      onTotalsChange?.(totalAssets);
    },
    [onTotalsChange],
  );

  return (
    <GenericCrudSection<Asset>
      config={{
        title: "Assets",
        itemName: "Asset",
        description: "Manage client's assets and calculate total net worth",
        createButtonLabel: "Add Asset",
        fetchEndpoint: `/api/clients/${clientId}/assets`,
        emptyMessage: "No assets found. Add your first asset to get started.",
        icon: Wallet,
      }}
      ListComponent={AssetsList}
      FormComponent={AssetForm}
      SummaryComponent={AssetsSummary}
      onItemsChange={handleItemsChange}
      clientId={clientId}
    />
  );
}
