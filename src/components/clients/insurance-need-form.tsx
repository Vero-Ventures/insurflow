"use client";

import { toast } from "sonner";
import {
  EntityForm,
  type EntityFormField,
} from "@/components/crud/entity-form";
import type { CorporateInsuranceNeed } from "@/types/business";
import {
  INSURANCE_NEED_TYPES,
  INSURANCE_NEED_TYPE_LABELS,
} from "@/lib/validation/insurance-need";

interface InsuranceNeedFormProps {
  clientId: string;
  businessId: string;
  item: CorporateInsuranceNeed | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const fields: EntityFormField[] = [
  {
    name: "insuranceType",
    label: "Insurance Type *",
    type: "select",
    required: true,
    placeholder: "Select insurance type",
    htmlId: "in-type",
    options: INSURANCE_NEED_TYPES.map((t) => ({
      value: t,
      label: INSURANCE_NEED_TYPE_LABELS[t],
    })),
  },
  {
    name: "coverageAmount",
    label: "Coverage Amount",
    type: "number",
    step: "0.01",
    min: "0",
    placeholder: "0.00",
    htmlId: "in-coverage",
  },
  {
    name: "notes",
    label: "Notes",
    type: "textarea",
    placeholder: "Additional details or justification...",
    rows: 3,
    htmlId: "in-notes",
  },
];

export function InsuranceNeedForm({
  clientId,
  businessId,
  item,
  onSuccess,
  onCancel,
}: InsuranceNeedFormProps) {
  const defaultValues = {
    insuranceType: item?.insuranceType || "",
    coverageAmount: item?.coverageAmount ? String(item.coverageAmount) : "",
    notes: item?.notes || "",
  };

  const handleSubmit = async (values: Record<string, string>) => {
    const payload: Record<string, unknown> = {
      insuranceType: values.insuranceType,
    };

    if (values.coverageAmount) {
      payload.coverageAmount = values.coverageAmount.replace(/,/g, "");
    }

    // Always include notes so users can clear them (send null for empty)
    payload.notes = (values.notes ?? "").trim() || null;

    const url = item
      ? `/api/clients/${clientId}/businesses/${businessId}/insurance-needs/${item.id}`
      : `/api/clients/${clientId}/businesses/${businessId}/insurance-needs`;

    const response = await fetch(url, {
      method: item ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let message = `Failed to ${item ? "update" : "create"} insurance need`;
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
        ? "Insurance need updated successfully"
        : "Insurance need created successfully",
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
