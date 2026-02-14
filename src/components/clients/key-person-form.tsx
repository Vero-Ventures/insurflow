"use client";

import { toast } from "sonner";
import {
  EntityForm,
  type EntityFormField,
} from "@/components/crud/entity-form";
import type { KeyPerson } from "@/types/business";

interface KeyPersonFormProps {
  clientId: string;
  businessId: string;
  item: KeyPerson | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const fields: EntityFormField[] = [
  {
    name: "name",
    label: "Name *",
    type: "text",
    required: true,
    placeholder: "e.g., Jane Smith",
    htmlId: "kp-name",
  },
  {
    name: "role",
    label: "Role *",
    type: "text",
    required: true,
    placeholder: "e.g., CEO, CTO",
    htmlId: "kp-role",
  },
  {
    name: "compensation",
    label: "Annual Compensation",
    type: "number",
    step: "0.01",
    min: "0",
    placeholder: "0.00",
    htmlId: "kp-compensation",
  },
  {
    name: "ownershipPercentage",
    label: "Ownership %",
    type: "number",
    step: "0.01",
    min: "0",
    max: "100",
    placeholder: "0.00",
    htmlId: "kp-ownership",
  },
];

export function KeyPersonForm({
  clientId,
  businessId,
  item,
  onSuccess,
  onCancel,
}: KeyPersonFormProps) {
  const defaultValues = {
    name: item?.name || "",
    role: item?.role || "",
    compensation: item?.compensation ? String(item.compensation) : "",
    ownershipPercentage: item?.ownershipPercentage
      ? String(item.ownershipPercentage)
      : "",
  };

  const handleSubmit = async (values: Record<string, string>) => {
    const payload: Record<string, unknown> = {
      name: (values.name ?? "").trim(),
      role: (values.role ?? "").trim(),
    };

    if (values.compensation) {
      payload.compensation = values.compensation.replace(/,/g, "");
    }

    if (values.ownershipPercentage) {
      payload.ownershipPercentage = values.ownershipPercentage;
    }

    const url = item
      ? `/api/clients/${clientId}/businesses/${businessId}/key-people/${item.id}`
      : `/api/clients/${clientId}/businesses/${businessId}/key-people`;

    const response = await fetch(url, {
      method: item ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let message = `Failed to ${item ? "update" : "create"} key person`;
      try {
        const error = await response.json();
        message = error.error || error.message || message;
      } catch {
        // ignore
      }
      throw new Error(message);
    }

    toast.success(
      item
        ? "Key person updated successfully"
        : "Key person created successfully",
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
