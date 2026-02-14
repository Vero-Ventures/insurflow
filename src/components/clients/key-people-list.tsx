"use client";

import {
  GenericCrudTable,
  type ColumnDef,
} from "@/components/crud/generic-crud-table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/constants";
import type { KeyPerson } from "@/types/business";

const columns: ColumnDef<KeyPerson>[] = [
  {
    key: "name",
    header: "Name",
    render: (value): React.ReactNode => (
      <span className="font-medium">{String(value)}</span>
    ),
  },
  {
    key: "role",
    header: "Role",
    render: (value): React.ReactNode => (
      <Badge
        variant="outline"
        className="border-indigo-200/60 bg-indigo-50 font-medium text-indigo-700 dark:border-indigo-800/40 dark:bg-indigo-950/40 dark:text-indigo-300"
      >
        {String(value)}
      </Badge>
    ),
  },
  {
    key: "compensation",
    header: "Compensation",
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
    key: "ownershipPercentage",
    header: "Ownership %",
    className: "text-right",
    render: (value): React.ReactNode => {
      const pct = typeof value === "string" ? parseFloat(value) : value;
      return (
        <span className="text-muted-foreground text-sm">
          {isNaN(pct as number) ? "0" : String(pct)}%
        </span>
      );
    },
  },
];

interface KeyPeopleListProps {
  clientId: string;
  businessId: string;
  items: KeyPerson[];
  isLoading: boolean;
  onEdit: (item: KeyPerson) => void;
  onItemDeleted: () => void;
}

export function KeyPeopleList({
  clientId,
  businessId,
  items,
  isLoading,
  onEdit,
  onItemDeleted,
}: KeyPeopleListProps) {
  const handleDelete = async (id: string) => {
    const response = await fetch(
      `/api/clients/${clientId}/businesses/${businessId}/key-people/${id}`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );
    if (!response.ok) throw new Error("Failed to delete key person");
  };

  return (
    <GenericCrudTable
      columns={columns}
      items={items}
      isLoading={isLoading}
      onEdit={onEdit}
      onDelete={handleDelete}
      onDeleteSuccess={onItemDeleted}
      emptyMessage="No key people found. Add key personnel to assess coverage needs."
      itemName="key person"
    />
  );
}
