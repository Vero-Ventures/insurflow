"use client";

import { toast } from "sonner";
import {
  EntityForm,
  type EntityFormField,
} from "@/components/crud/entity-form";
import type { Shareholder } from "@/types/shareholder";

interface ShareholderFormProps {
  clientId: string;
  businessId: string;
  item: Shareholder | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const fields: EntityFormField[] = [
  {
    name: "name",
    label: "Shareholder Name *",
    type: "text",
    required: true,
    placeholder: "e.g., John Doe",
    htmlId: "sh-name",
  },
  {
    name: "ownershipPercentage",
    label: "Ownership % *",
    type: "number",
    required: true,
    step: "0.01",
    min: "0",
    max: "100",
    placeholder: "0.00",
    htmlId: "sh-ownership",
  },
];

export function ShareholderForm({
  clientId,
  businessId,
  item,
  onSuccess,
  onCancel,
}: ShareholderFormProps) {
  const defaultValues = {
    name: item?.name || "",
    ownershipPercentage: item?.ownershipPercentage
      ? String(item.ownershipPercentage)
      : "",
  };

  const handleSubmit = async (values: Record<string, string>) => {
    const payload = {
      name: (values.name ?? "").trim(),
      ownershipPercentage: String(values.ownershipPercentage ?? ""),
    };

    const url = item
      ? `/api/clients/${clientId}/businesses/${businessId}/shareholders/${item.id}`
      : `/api/clients/${clientId}/businesses/${businessId}/shareholders`;

    const response = await fetch(url, {
      method: item ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let message = `Failed to ${item ? "update" : "create"} shareholder`;
      try {
        const error = await response.json();
        message =
          error.details?.ownershipPercentage ||
          error.error ||
          error.message ||
          message;
      } catch {
        // ignore
      }
      throw new Error(message);
    }

    toast.success(
      item
        ? "Shareholder updated successfully"
        : "Shareholder created successfully",
    );
    onSuccess();
  };

  return (
    <EntityForm
      fields={fields}
      defaultValues={defaultValues}
      resetKey={item?.id ?? "new"}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      submitLabel={item ? "Update" : "Create"}
    />
  );
}
