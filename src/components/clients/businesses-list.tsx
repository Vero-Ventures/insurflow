"use client";

import {
  GenericCrudTable,
  type ColumnDef,
} from "@/components/crud/generic-crud-table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/constants";
import type { Business } from "@/types/business";
import { BUSINESS_TYPE_LABELS } from "@/lib/validation/business";

const BUSINESS_TYPE_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  corporation: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200/60 dark:border-blue-800/40",
  },
  partnership: {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200/60 dark:border-purple-800/40",
  },
  sole_proprietorship: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200/60 dark:border-amber-800/40",
  },
  trust: {
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

const getTypeColors = (type: string) =>
  BUSINESS_TYPE_COLORS[type] ?? DEFAULT_COLORS;

function buildColumns(
  onSelect?: (business: Business) => void,
): ColumnDef<Business>[] {
  return [
    {
      key: "name",
      header: "Name",
      render: (value, item): React.ReactNode =>
        onSelect ? (
          <button
            type="button"
            onClick={() => onSelect(item)}
            className="text-primary hover:text-primary/80 cursor-pointer font-medium underline-offset-4 hover:underline"
          >
            {String(value)}
          </button>
        ) : (
          <span className="font-medium">{String(value)}</span>
        ),
    },
    {
      key: "type",
      header: "Type",
      render: (value): React.ReactNode => {
        const typeKey = String(value);
        const colors = getTypeColors(typeKey);
        return (
          <Badge
            variant="outline"
            className={`${colors.bg} ${colors.text} ${colors.border} font-medium`}
          >
            {BUSINESS_TYPE_LABELS[
              typeKey as keyof typeof BUSINESS_TYPE_LABELS
            ] || typeKey}
          </Badge>
        );
      },
    },
    {
      key: "valuation",
      header: "Valuation",
      className: "text-right",
      render: (value): React.ReactNode => {
        const numValue = typeof value === "string" ? parseFloat(value) : value;
        return (
          <span className="font-currency text-foreground font-semibold">
            {formatCurrency(
              isNaN(numValue as number) ? 0 : (numValue as number),
            )}
          </span>
        );
      },
    },
  ];
}

interface BusinessesListProps {
  clientId: string;
  items: Business[];
  isLoading: boolean;
  onEdit: (business: Business) => void;
  onItemDeleted: () => void;
  onSelect?: (business: Business) => void;
}

export function BusinessesList({
  clientId,
  items,
  isLoading,
  onEdit,
  onItemDeleted,
  onSelect,
}: BusinessesListProps) {
  const columns = buildColumns(onSelect);

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/clients/${clientId}/businesses/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to delete business");
  };

  return (
    <GenericCrudTable
      columns={columns}
      items={items}
      isLoading={isLoading}
      onEdit={onEdit}
      onDelete={handleDelete}
      onDeleteSuccess={onItemDeleted}
      emptyMessage="No businesses found. Add your first business to get started."
      itemName="business"
    />
  );
}
