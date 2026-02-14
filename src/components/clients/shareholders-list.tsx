"use client";

import {
  GenericCrudTable,
  type ColumnDef,
} from "@/components/crud/generic-crud-table";
import type { Shareholder } from "@/types/shareholder";

const columns: ColumnDef<Shareholder>[] = [
  {
    key: "name",
    header: "Name",
    render: (value): React.ReactNode => (
      <span className="font-medium">{String(value)}</span>
    ),
  },
  {
    key: "ownershipPercentage",
    header: "Ownership %",
    className: "text-right",
    render: (value): React.ReactNode => {
      const pct = typeof value === "string" ? parseFloat(value) : value;
      return (
        <span className="font-currency text-foreground font-semibold">
          {isNaN(pct as number) ? "0" : String(pct)}%
        </span>
      );
    },
  },
];

interface ShareholdersListProps {
  clientId: string;
  businessId: string;
  items: Shareholder[];
  isLoading: boolean;
  onEdit: (item: Shareholder) => void;
  onItemDeleted: () => void;
}

export function ShareholdersList({
  clientId,
  businessId,
  items,
  isLoading,
  onEdit,
  onItemDeleted,
}: ShareholdersListProps) {
  const handleDelete = async (id: string) => {
    const response = await fetch(
      `/api/clients/${clientId}/businesses/${businessId}/shareholders/${id}`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );
    if (!response.ok) throw new Error("Failed to delete shareholder");
  };

  // Calculate total ownership for display
  const totalOwnership = items.reduce((sum, s) => {
    const pct = parseFloat(s.ownershipPercentage) || 0;
    return sum + pct;
  }, 0);

  return (
    <div className="space-y-3">
      <GenericCrudTable
        columns={columns}
        items={items}
        isLoading={isLoading}
        onEdit={onEdit}
        onDelete={handleDelete}
        onDeleteSuccess={onItemDeleted}
        emptyMessage="No shareholders found. Add shareholders to model ownership structure."
        itemName="shareholder"
      />
      {items.length > 0 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">Total Ownership:</span>
          <span
            className={`font-semibold ${totalOwnership > 100 ? "text-destructive" : "text-foreground"}`}
          >
            {totalOwnership}%
          </span>
        </div>
      )}
    </div>
  );
}
