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
      const bps = Math.round(Number(value) * 100);
      return (
        <span className="font-currency text-foreground font-semibold">
          {(bps / 100).toFixed(2)}%
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

  // Calculate total ownership for display using integer basis points
  // (percent × 100) to avoid IEEE-754 floating-point rounding errors.
  const totalBasisPoints = items.reduce(
    (sum, s) => sum + Math.round(Number(s.ownershipPercentage) * 100),
    0,
  );
  const totalDisplay = (totalBasisPoints / 100).toFixed(2);

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
            className={`font-semibold ${totalBasisPoints > 10_000 ? "text-destructive" : "text-foreground"}`}
          >
            {totalDisplay}%
          </span>
        </div>
      )}
    </div>
  );
}
