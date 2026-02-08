"use client";

import {
  GenericCrudTable,
  type ColumnDef,
} from "@/components/crud/generic-crud-table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/constants";
import { Droplets, Lock } from "lucide-react";
import type { Asset } from "@/types/asset";

const ASSET_TYPE_LABELS: Record<string, string> = {
  // US retirement accounts
  "401k": "401(k)",
  "403b": "403(b)",
  ira_traditional: "Traditional IRA",
  ira_roth: "Roth IRA",
  sep_ira: "SEP IRA",
  simple_ira: "SIMPLE IRA",
  hsa: "HSA",
  "529_plan": "529 Plan",
  // Investment accounts
  brokerage: "Brokerage",
  // Other assets
  real_estate: "Real Estate",
  life_insurance: "Life Insurance",
  business_interest: "Business Interest",
  pension: "Pension",
  stock_options: "Stock Options",
  cryptocurrency: "Crypto",
  collectibles: "Collectibles",
  savings: "Savings",
  other: "Other",
};

// Color mappings for asset type badges
const ASSET_TYPE_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  // Retirement accounts - emerald
  "401k": {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200/60 dark:border-emerald-800/40",
  },
  "403b": {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200/60 dark:border-emerald-800/40",
  },
  ira_traditional: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200/60 dark:border-emerald-800/40",
  },
  ira_roth: {
    bg: "bg-teal-50 dark:bg-teal-950/40",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200/60 dark:border-teal-800/40",
  },
  sep_ira: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200/60 dark:border-emerald-800/40",
  },
  simple_ira: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200/60 dark:border-emerald-800/40",
  },
  hsa: {
    bg: "bg-cyan-50 dark:bg-cyan-950/40",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-200/60 dark:border-cyan-800/40",
  },
  "529_plan": {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200/60 dark:border-blue-800/40",
  },
  // Investment accounts - blue
  brokerage: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200/60 dark:border-blue-800/40",
  },
  // Real assets - amber
  real_estate: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200/60 dark:border-amber-800/40",
  },
  // Insurance - purple
  life_insurance: {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200/60 dark:border-purple-800/40",
  },
  // Business - indigo
  business_interest: {
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200/60 dark:border-indigo-800/40",
  },
  pension: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200/60 dark:border-emerald-800/40",
  },
  stock_options: {
    bg: "bg-violet-50 dark:bg-violet-950/40",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-200/60 dark:border-violet-800/40",
  },
  // Alternative assets - orange
  cryptocurrency: {
    bg: "bg-orange-50 dark:bg-orange-950/40",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200/60 dark:border-orange-800/40",
  },
  collectibles: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200/60 dark:border-rose-800/40",
  },
  // Cash - green
  savings: {
    bg: "bg-green-50 dark:bg-green-950/40",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-200/60 dark:border-green-800/40",
  },
  // Default - gray
  other: {
    bg: "bg-gray-50 dark:bg-gray-900/40",
    text: "text-gray-700 dark:text-gray-300",
    border: "border-gray-200/60 dark:border-gray-700/40",
  },
};

const getAssetTypeColors = (type: string) => {
  return (
    ASSET_TYPE_COLORS[type] || {
      bg: "bg-gray-50 dark:bg-gray-900/40",
      text: "text-gray-700 dark:text-gray-300",
      border: "border-gray-200/60 dark:border-gray-700/40",
    }
  );
};

const columns: ColumnDef<Asset>[] = [
  {
    key: "name",
    header: "Name",
    render: (value): React.ReactNode => (
      <span className="font-medium">{String(value)}</span>
    ),
  },
  {
    key: "type",
    header: "Type",
    render: (value): React.ReactNode => {
      const typeKey = String(value);
      const colors = getAssetTypeColors(typeKey);
      return (
        <Badge
          variant="outline"
          className={`${colors.bg} ${colors.text} ${colors.border} font-medium`}
        >
          {ASSET_TYPE_LABELS[typeKey] || String(value)}
        </Badge>
      );
    },
  },
  {
    key: "currentValue",
    header: "Value",
    className: "text-right",
    render: (value): React.ReactNode => {
      const numValue = typeof value === "string" ? parseFloat(value) : value;
      return (
        <span className="font-currency text-foreground font-semibold">
          {formatCurrency(isNaN(numValue as number) ? 0 : (numValue as number))}
        </span>
      );
    },
  },
  {
    key: "isLiquid",
    header: "Liquidity",
    render: (value): React.ReactNode => (
      <div className="flex items-center gap-2">
        {value ? (
          <>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
              <Droplets className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm text-blue-700 dark:text-blue-300">
              Liquid
            </span>
          </>
        ) : (
          <>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <Lock className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
            </div>
            <span className="text-muted-foreground text-sm">Illiquid</span>
          </>
        )}
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
      credentials: "include",
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
