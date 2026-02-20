"use client";

import {
  GenericCrudTable,
  type ColumnDef,
} from "@/components/crud/generic-crud-table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/constants";
import { formatPolicyExpiryMonthYear } from "@/lib/policy-utils";
import {
  POLICY_TYPE_LABELS,
  POLICY_STATUS_LABELS,
  type Policy,
  type PolicyType,
  type PolicyStatus,
} from "@/types/policy";

// Color mappings for policy type badges
const POLICY_TYPE_COLORS: Record<
  PolicyType,
  { bg: string; text: string; border: string }
> = {
  term_life: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200/60 dark:border-blue-800/40",
  },
  whole_life: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200/60 dark:border-emerald-800/40",
  },
  universal_life: {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200/60 dark:border-purple-800/40",
  },
  variable_life: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200/60 dark:border-amber-800/40",
  },
  group_life: {
    bg: "bg-teal-50 dark:bg-teal-950/40",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200/60 dark:border-teal-800/40",
  },
  other: {
    bg: "bg-gray-50 dark:bg-gray-900/40",
    text: "text-gray-700 dark:text-gray-300",
    border: "border-gray-200/60 dark:border-gray-700/40",
  },
};

// Color mappings for policy status badges
const POLICY_STATUS_COLORS: Record<
  PolicyStatus,
  { bg: string; text: string; border: string }
> = {
  active: {
    bg: "bg-green-50 dark:bg-green-950/40",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-200/60 dark:border-green-800/40",
  },
  lapsed: {
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200/60 dark:border-red-800/40",
  },
  surrendered: {
    bg: "bg-gray-50 dark:bg-gray-900/40",
    text: "text-gray-700 dark:text-gray-300",
    border: "border-gray-200/60 dark:border-gray-700/40",
  },
  paid_up: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200/60 dark:border-blue-800/40",
  },
  pending: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200/60 dark:border-amber-800/40",
  },
};

const getPolicyTypeColors = (type: PolicyType) => {
  return (
    POLICY_TYPE_COLORS[type] || {
      bg: "bg-gray-50 dark:bg-gray-900/40",
      text: "text-gray-700 dark:text-gray-300",
      border: "border-gray-200/60 dark:border-gray-700/40",
    }
  );
};

const getPolicyStatusColors = (status: PolicyStatus) => {
  return (
    POLICY_STATUS_COLORS[status] || {
      bg: "bg-gray-50 dark:bg-gray-900/40",
      text: "text-gray-700 dark:text-gray-300",
      border: "border-gray-200/60 dark:border-gray-700/40",
    }
  );
};

const columns: ColumnDef<Policy>[] = [
  {
    key: "carrierName",
    header: "Carrier",
    render: (value): React.ReactNode => (
      <span className="font-medium">{value ? String(value) : "—"}</span>
    ),
  },
  {
    key: "type",
    header: "Type",
    render: (value): React.ReactNode => {
      const typeKey = String(value) as PolicyType;
      const colors = getPolicyTypeColors(typeKey);
      return (
        <Badge
          variant="outline"
          className={`${colors.bg} ${colors.text} ${colors.border} font-medium`}
        >
          {POLICY_TYPE_LABELS[typeKey] || String(value)}
        </Badge>
      );
    },
  },
  {
    key: "faceAmount",
    header: "Face Amount",
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
    key: "status",
    header: "Status",
    render: (value): React.ReactNode => {
      const statusKey = String(value) as PolicyStatus;
      const colors = getPolicyStatusColors(statusKey);
      return (
        <Badge
          variant="outline"
          className={`${colors.bg} ${colors.text} ${colors.border} font-medium`}
        >
          {POLICY_STATUS_LABELS[statusKey] || String(value)}
        </Badge>
      );
    },
  },
  {
    key: "expiryDate",
    header: "Expires",
    render: (value): React.ReactNode => {
      const formattedDate = formatPolicyExpiryMonthYear(
        value ? String(value) : null,
      );
      if (!formattedDate) {
        return <span className="text-muted-foreground">—</span>;
      }

      return <span className="text-muted-foreground">{formattedDate}</span>;
    },
  },
];

interface PoliciesListProps {
  clientId: string;
  items: Policy[];
  isLoading: boolean;
  onEdit: (policy: Policy) => void;
  onItemDeleted: () => void;
}

export function PoliciesList({
  clientId,
  items,
  isLoading,
  onEdit,
  onItemDeleted,
}: PoliciesListProps) {
  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/clients/${clientId}/policies/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to delete policy");
  };

  return (
    <GenericCrudTable
      columns={columns}
      items={items}
      isLoading={isLoading}
      onEdit={onEdit}
      onDelete={handleDelete}
      onDeleteSuccess={onItemDeleted}
      emptyMessage="No policies recorded. Add existing life insurance policies to track coverage."
      itemName="policy"
    />
  );
}
