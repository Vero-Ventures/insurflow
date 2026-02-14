"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GenericCrudForm } from "@/components/crud/generic-crud-form";
import { toast } from "sonner";
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

export function InsuranceNeedForm({
  clientId,
  businessId,
  item,
  onSuccess,
  onCancel,
}: InsuranceNeedFormProps) {
  const [insuranceType, setInsuranceType] = useState(item?.insuranceType || "");
  const [coverageAmount, setCoverageAmount] = useState(
    item?.coverageAmount ? String(item.coverageAmount) : "",
  );
  const [notes, setNotes] = useState(item?.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setInsuranceType(item?.insuranceType || "");
    setCoverageAmount(item?.coverageAmount ? String(item.coverageAmount) : "");
    setNotes(item?.notes || "");
  }, [item]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!insuranceType) {
      toast.error("Please select an insurance type");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: Record<string, unknown> = {
        insuranceType,
      };

      if (coverageAmount) {
        payload.coverageAmount = String(coverageAmount).replace(/,/g, "");
      }

      // Always include notes so users can clear them (send null for empty)
      payload.notes = notes.trim() || null;

      const url = item
        ? `/api/clients/${clientId}/businesses/${businessId}/insurance-needs/${item.id}`
        : `/api/clients/${clientId}/businesses/${businessId}/insurance-needs`;

      const method = item ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GenericCrudForm
      onSubmit={handleSubmit}
      onCancel={onCancel}
      isSubmitting={isSubmitting}
      submitLabel={item ? "Update" : "Create"}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="in-type">Insurance Type *</Label>
          <Select
            value={insuranceType}
            onValueChange={setInsuranceType}
            disabled={isSubmitting}
          >
            <SelectTrigger id="in-type">
              <SelectValue placeholder="Select insurance type" />
            </SelectTrigger>
            <SelectContent>
              {INSURANCE_NEED_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {INSURANCE_NEED_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="in-coverage">Coverage Amount</Label>
          <Input
            id="in-coverage"
            type="number"
            step="0.01"
            min="0"
            value={coverageAmount}
            onChange={(e) => setCoverageAmount(e.target.value)}
            placeholder="0.00"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="in-notes">Notes</Label>
          <Textarea
            id="in-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional details or justification..."
            rows={3}
            disabled={isSubmitting}
          />
        </div>
      </div>
    </GenericCrudForm>
  );
}
