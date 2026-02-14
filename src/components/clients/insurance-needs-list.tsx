"use client";

import {
  GenericCrudTable,
  type ColumnDef,
} from "@/components/crud/generic-crud-table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/constants";
import type { CorporateInsuranceNeed } from "@/types/business";
import { INSURANCE_NEED_TYPE_LABELS } from "@/lib/validation/insurance-need";

const TYPE_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  key_person: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200/60 dark:border-blue-800/40",
  },
  buy_sell: {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200/60 dark:border-purple-800/40",
  },
  debt_coverage: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200/60 dark:border-amber-800/40",
  },
  succession: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200/60 dark:border-emerald-800/40",
  },
  other: {
    bg: "bg-gray-50 dark:bg-gray-900/40",
    text: "text-gray-700 dark:text-gray-300",
    border: "border-gray-200/60 dark:border-gray-700/40",
  },
};

const DEFAULT_COLORS = {
  bg: "bg-gray-50 dark:bg-gray-900/40",
  text: "text-gray-700 dark:text-gray-300",
  border: "border-gray-200/60 dark:border-gray-700/40",
};

const getTypeColors = (type: string) => TYPE_COLORS[type] ?? DEFAULT_COLORS;

const columns: ColumnDef<CorporateInsuranceNeed>[] = [
  {
    key: "insuranceType",
    header: "Type",
    render: (value): React.ReactNode => {
      const typeKey = String(value);
      const colors = getTypeColors(typeKey);
      return (
        <Badge
          variant="outline"
          className={`${colors.bg} ${colors.text} ${colors.border} font-medium`}
        >
          {INSURANCE_NEED_TYPE_LABELS[
            typeKey as keyof typeof INSURANCE_NEED_TYPE_LABELS
          ] || typeKey}
        </Badge>
      );
    },
  },
  {
    key: "coverageAmount",
    header: "Coverage Amount",
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
    key: "notes",
    header: "Notes",
    render: (value): React.ReactNode => (
      <span className="text-muted-foreground max-w-[200px] truncate text-sm">
        {value ? String(value) : "—"}
      </span>
    ),
  },
];

interface InsuranceNeedsListProps {
  clientId: string;
  businessId: string;
  items: CorporateInsuranceNeed[];
  isLoading: boolean;
  onEdit: (item: CorporateInsuranceNeed) => void;
  onItemDeleted: () => void;
}

export function InsuranceNeedsList({
  clientId,
  businessId,
  items,
  isLoading,
  onEdit,
  onItemDeleted,
}: InsuranceNeedsListProps) {
  const handleDelete = async (id: string) => {
    const response = await fetch(
      `/api/clients/${clientId}/businesses/${businessId}/insurance-needs/${id}`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );
    if (!response.ok) throw new Error("Failed to delete insurance need");
  };

  return (
    <GenericCrudTable
      columns={columns}
      items={items}
      isLoading={isLoading}
      onEdit={onEdit}
      onDelete={handleDelete}
      onDeleteSuccess={onItemDeleted}
      emptyMessage="No insurance needs found. Add corporate insurance requirements."
      itemName="insurance need"
    />
  );
}
