"use client";

import {
  GenericCrudTable,
  type ColumnDef,
} from "@/components/crud/generic-crud-table";
import { Badge } from "@/components/ui/badge";
import type { Debt } from "../../types/debt";

const DEBT_TYPE_LABELS: Record<string, string> = {
  mortgage: "Mortgage",
  car_loan: "Car Loan",
  personal_loan: "Personal Loan",
  credit_card: "Credit Card",
  line_of_credit: "Line of Credit",
  student_loan: "Student Loan",
  other: "Other",
};

const columns: ColumnDef<Debt>[] = [
  {
    key: "name",
    header: "Name",
  },
  {
    key: "type",
    header: "Type",
    render: (value): React.ReactNode => (
      <Badge variant="secondary">
        {DEBT_TYPE_LABELS[String(value) as string] || String(value)}
      </Badge>
    ),
  },
  {
    key: "currentBalance",
    header: "Balance",
    render: (value): React.ReactNode => {
      const numValue = typeof value === "string" ? parseFloat(value) : value;
      return new Intl.NumberFormat("en-CA", {
        style: "currency",
        currency: "CAD",
      }).format(isNaN(numValue as number) ? 0 : (numValue as number));
    },
  },
];

interface DebtsListRefactoredProps {
  clientId: string;
  items: Debt[];
  isLoading: boolean;
  onEdit: (debt: Debt) => void;
  onItemDeleted: () => void;
}

export function DebtsListRefactored({
  clientId,
  items,
  isLoading,
  onEdit,
  onItemDeleted,
}: DebtsListRefactoredProps) {
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
