"use client";

import {
  GenericCrudTable,
  type ColumnDef,
} from "@/components/crud/generic-crud-table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/constants";
import { DEBT_TYPE_LABELS, type DEBT_TYPES } from "@/lib/validation/debt";
import type { Debt } from "@/types/debt";

type DebtType = (typeof DEBT_TYPES)[number];

// Color mappings for debt type badges
const DEBT_TYPE_COLORS: Record<
  DebtType,
  { bg: string; text: string; border: string }
> = {
  // Real estate related - amber
  mortgage: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200/60 dark:border-amber-800/40",
  },
  heloc: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200/60 dark:border-amber-800/40",
  },
  // Auto - blue
  car_loan: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200/60 dark:border-blue-800/40",
  },
  // Education - purple
  student_loan: {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200/60 dark:border-purple-800/40",
  },
  // Personal - teal
  personal_loan: {
    bg: "bg-teal-50 dark:bg-teal-950/40",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200/60 dark:border-teal-800/40",
  },
  // Credit - red (high interest)
  credit_card: {
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200/60 dark:border-red-800/40",
  },
  // Lines of credit - orange
  line_of_credit: {
    bg: "bg-orange-50 dark:bg-orange-950/40",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200/60 dark:border-orange-800/40",
  },
  // Business - indigo
  business_loan: {
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200/60 dark:border-indigo-800/40",
  },
  // Other - gray
  other: {
    bg: "bg-gray-50 dark:bg-gray-900/40",
    text: "text-gray-700 dark:text-gray-300",
    border: "border-gray-200/60 dark:border-gray-700/40",
  },
};

const getDebtTypeColors = (type: DebtType) => {
  return (
    DEBT_TYPE_COLORS[type] || {
      bg: "bg-gray-50 dark:bg-gray-900/40",
      text: "text-gray-700 dark:text-gray-300",
      border: "border-gray-200/60 dark:border-gray-700/40",
    }
  );
};

const columns: ColumnDef<Debt>[] = [
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
      const typeKey = String(value) as DebtType;
      const colors = getDebtTypeColors(typeKey);
      return (
        <Badge
          variant="outline"
          className={`${colors.bg} ${colors.text} ${colors.border} font-medium`}
        >
          {DEBT_TYPE_LABELS[typeKey] || String(value)}
        </Badge>
      );
    },
  },
  {
    key: "currentBalance",
    header: "Balance",
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
];

interface DebtsListProps {
  clientId: string;
  items: Debt[];
  isLoading: boolean;
  onEdit: (debt: Debt) => void;
  onItemDeleted: () => void;
}

export function DebtsList({
  clientId,
  items,
  isLoading,
  onEdit,
  onItemDeleted,
}: DebtsListProps) {
  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/clients/${clientId}/debts/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to delete debt");
  };

  return (
    <GenericCrudTable
      columns={columns}
      items={items}
      isLoading={isLoading}
      onEdit={onEdit}
      onDelete={handleDelete}
      onDeleteSuccess={onItemDeleted}
      emptyMessage="No debts recorded."
      itemName="debt"
    />
  );
}
