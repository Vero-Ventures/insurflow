"use client";

import {
  GenericCrudTable,
  type ColumnDef,
} from "@/components/crud/generic-crud-table";
import { Badge } from "@/components/ui/badge";
import type { Asset } from "@/types/asset";

const ASSET_TYPE_LABELS: Record<string, string> = {
  rrsp: "RRSP",
  tfsa: "TFSA",
  non_registered: "Non-Registered",
  rrif: "RRIF",
  lira: "LIRA",
  lif: "LIF",
  real_estate: "Real Estate",
  life_insurance: "Life Insurance",
  business_interest: "Business Interest",
  pension: "Pension",
  stock_options: "Stock Options",
  cryptocurrency: "Cryptocurrency",
  collectibles: "Collectibles",
  other: "Other",
};

const columns: ColumnDef<Asset>[] = [
  {
    key: "name",
    header: "Name",
  },
  {
    key: "type",
    header: "Type",
    render: (value): React.ReactNode => (
      <Badge variant="secondary">
        {ASSET_TYPE_LABELS[String(value) as string] || String(value)}
      </Badge>
    ),
  },
  {
    key: "currentValue",
    header: "Value",
    render: (value): React.ReactNode => {
      const numValue = typeof value === "string" ? parseFloat(value) : value;
      return new Intl.NumberFormat("en-CA", {
        style: "currency",
        currency: "CAD",
      }).format(isNaN(numValue as number) ? 0 : (numValue as number));
    },
  },
  {
    key: "isLiquid",
    header: "Liquid",
    render: (value): React.ReactNode => (
      <div className="flex items-center gap-2">
        <div
          className={`h-3 w-3 rounded-full ${
            value ? "bg-blue-500" : "bg-gray-300"
          }`}
        />
        {value ? "Yes" : "No"}
      </div>
    ),
  },
];

interface AssetsListProps {
  clientId: string;
  items: Asset[];
  isLoading: boolean;
  onEdit: (asset: Asset) => void;
  onItemDeleted: () => void;
}

export function AssetsList({
  clientId,
  items,
  isLoading,
  onEdit,
  onItemDeleted,
}: AssetsListProps) {
  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/clients/${clientId}/assets/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete asset");
  };

  return (
    <GenericCrudTable
      columns={columns}
      items={items}
      isLoading={isLoading}
      onEdit={onEdit}
      onDelete={handleDelete}
      onDeleteSuccess={onItemDeleted}
      emptyMessage="No assets found. Add your first asset to get started."
      itemName="asset"
    />
  );
}
