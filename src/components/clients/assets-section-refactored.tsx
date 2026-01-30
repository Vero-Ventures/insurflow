"use client";

import { GenericCrudSection } from "@/components/crud/generic-crud-section";
import { AssetsList } from "@/components/clients/assets-list-refactored";
import { AssetFormRefactored } from "@/components/clients/asset-form-refactored";
import { AssetsSummary } from "@/components/clients/assets-summary";
import type { Asset } from "@/types/asset";

interface AssetsSectionRefactoredProps {
  clientId: string;
  onTotalsChange?: (totalAssets: number) => void;
}

export function AssetsSectionRefactored({
  clientId,
  onTotalsChange,
}: AssetsSectionRefactoredProps) {
  const handleItemsChange = (items: Asset[]) => {
    const totalAssets = items.reduce((sum, asset) => {
      const value =
        typeof asset.currentValue === "string"
          ? parseFloat(asset.currentValue)
          : asset.currentValue;
      return sum + (isNaN(value) ? 0 : value);
    }, 0);

    onTotalsChange?.(totalAssets);
  };

  return (
    <GenericCrudSection<Asset>
      config={{
        title: "Assets",
        itemName: "Asset",
        description: "Manage client's assets and calculate total net worth",
        createButtonLabel: "Add Asset",
        fetchEndpoint: `/api/clients/${clientId}/assets`,
        emptyMessage: "No assets found. Add your first asset to get started.",
      }}
      ListComponent={AssetsList}
      FormComponent={AssetFormRefactored}
      SummaryComponent={AssetsSummary}
      onItemsChange={handleItemsChange}
      clientId={clientId}
    />
  );
}
