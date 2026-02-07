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

const columns: ColumnDef<Debt>[] = [
  {
    key: "name",
    header: "Name",
  },
  {
    key: "type",
    header: "Type",
    render: (value): React.ReactNode => {
      const typeKey = String(value) as DebtType;
      return (
        <Badge variant="secondary">
          {DEBT_TYPE_LABELS[typeKey] || String(value)}
        </Badge>
      );
    },
  },
  {
    key: "currentBalance",
    header: "Balance",
    render: (value): React.ReactNode => {
      const numValue = typeof value === "string" ? parseFloat(value) : value;
      return formatCurrency(
        isNaN(numValue as number) ? 0 : (numValue as number),
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
