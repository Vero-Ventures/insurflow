"use client";

import {
  GenericCrudTable,
  type ColumnDef,
} from "@/components/crud/generic-crud-table";
import { Badge } from "@/components/ui/badge";
import { Star, StarOff } from "lucide-react";
import type { Beneficiary } from "@/types/beneficiary";
import { BENEFICIARY_RELATIONSHIP_LABELS } from "@/lib/validation/beneficiary";

// Color mappings for relationship type badges
const RELATIONSHIP_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  spouse: {
    bg: "bg-pink-50 dark:bg-pink-950/40",
    text: "text-pink-700 dark:text-pink-300",
    border: "border-pink-200/60 dark:border-pink-800/40",
  },
  child: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200/60 dark:border-blue-800/40",
  },
  parent: {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200/60 dark:border-purple-800/40",
  },
  sibling: {
    bg: "bg-teal-50 dark:bg-teal-950/40",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200/60 dark:border-teal-800/40",
  },
  grandchild: {
    bg: "bg-cyan-50 dark:bg-cyan-950/40",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-200/60 dark:border-cyan-800/40",
  },
  grandparent: {
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200/60 dark:border-indigo-800/40",
  },
  trust: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200/60 dark:border-amber-800/40",
  },
  charity: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200/60 dark:border-emerald-800/40",
  },
  estate: {
    bg: "bg-slate-50 dark:bg-slate-950/40",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200/60 dark:border-slate-800/40",
  },
  business_partner: {
    bg: "bg-orange-50 dark:bg-orange-950/40",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200/60 dark:border-orange-800/40",
  },
  other: {
    bg: "bg-gray-50 dark:bg-gray-900/40",
    text: "text-gray-700 dark:text-gray-300",
    border: "border-gray-200/60 dark:border-gray-700/40",
  },
};

const getRelationshipColors = (relationship: string) => {
  return (
    RELATIONSHIP_COLORS[relationship] || {
      bg: "bg-gray-50 dark:bg-gray-900/40",
      text: "text-gray-700 dark:text-gray-300",
      border: "border-gray-200/60 dark:border-gray-700/40",
    }
  );
};

const columns: ColumnDef<Beneficiary>[] = [
  {
    key: "firstName",
    header: "Name",
    render: (_value, item): React.ReactNode => (
      <span className="font-medium">
        {item?.firstName} {item?.lastName}
      </span>
    ),
  },
  {
    key: "relationship",
    header: "Relationship",
    render: (value): React.ReactNode => {
      const relKey = String(value);
      const colors = getRelationshipColors(relKey);
      return (
        <Badge
          variant="outline"
          className={`${colors.bg} ${colors.text} ${colors.border} font-medium`}
        >
          {BENEFICIARY_RELATIONSHIP_LABELS[
            relKey as keyof typeof BENEFICIARY_RELATIONSHIP_LABELS
          ] || String(value)}
        </Badge>
      );
    },
  },
  {
    key: "isPrimary",
    header: "Type",
    render: (value): React.ReactNode => (
      <div className="flex items-center gap-2">
        {value ? (
          <>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/40">
              <Star className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <span className="text-sm text-yellow-700 dark:text-yellow-300">
              Primary
            </span>
          </>
        ) : (
          <>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <StarOff className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
            </div>
            <span className="text-muted-foreground text-sm">Contingent</span>
          </>
        )}
      </div>
    ),
  },
];

interface BeneficiaryListProps {
  clientId: string;
  items: Beneficiary[];
  isLoading: boolean;
  onEdit: (beneficiary: Beneficiary) => void;
  onItemDeleted: () => void;
}

export function BeneficiaryList({
  clientId,
  items,
  isLoading,
  onEdit,
  onItemDeleted,
}: BeneficiaryListProps) {
  const handleDelete = async (id: string) => {
    const response = await fetch(
      `/api/clients/${clientId}/beneficiaries/${id}`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );
    if (!response.ok) throw new Error("Failed to delete beneficiary");
  };

  return (
    <GenericCrudTable
      columns={columns}
      items={items}
      isLoading={isLoading}
      onEdit={onEdit}
      onDelete={handleDelete}
      onDeleteSuccess={onItemDeleted}
      emptyMessage="No beneficiaries found. Add your first beneficiary to get started."
      itemName="beneficiary"
    />
  );
}

// TODO: Remove this alias once all imports are updated to use BeneficiaryList.
export const BeneficiariesList = BeneficiaryList;
