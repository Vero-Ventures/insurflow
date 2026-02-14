"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GenericCrudForm } from "@/components/crud/generic-crud-form";
import { toast } from "sonner";
import type { Business } from "@/types/business";
import {
  BUSINESS_TYPES,
  BUSINESS_TYPE_LABELS,
} from "@/lib/validation/business";

interface BusinessFormProps {
  clientId: string;
  item: Business | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BusinessForm({
  clientId,
  item,
  onSuccess,
  onCancel,
}: BusinessFormProps) {
  const [name, setName] = useState(item?.name || "");
  const [type, setType] = useState(item?.type || "");
  const [valuation, setValuation] = useState(
    item?.valuation ? String(item.valuation) : "",
  );
  const [fiscalYearEnd, setFiscalYearEnd] = useState(item?.fiscalYearEnd || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName(item?.name || "");
    setType(item?.type || "");
    setValuation(item?.valuation ? String(item.valuation) : "");
    setFiscalYearEnd(item?.fiscalYearEnd || "");
  }, [item]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim() || !type) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: Record<string, unknown> = {
        name: name.trim(),
        type,
      };

      if (valuation) {
        payload.valuation = String(valuation).replace(/,/g, "");
      }

      if (fiscalYearEnd) {
        payload.fiscalYearEnd = fiscalYearEnd;
      }

      const url = item
        ? `/api/clients/${clientId}/businesses/${item.id}`
        : `/api/clients/${clientId}/businesses`;

      const method = item ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = `Failed to ${item ? "update" : "create"} business`;
        try {
          const error = await response.json();
          message = error.error || error.message || message;
        } catch {
          // ignore json parse errors
        }
        throw new Error(message);
      }

      toast.success(
        item
          ? "Business updated successfully"
          : "Business created successfully",
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
          <Label htmlFor="name">Business Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Acme Corp"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Business Type *</Label>
          <Select value={type} onValueChange={setType} disabled={isSubmitting}>
            <SelectTrigger id="type">
              <SelectValue placeholder="Select business type" />
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {BUSINESS_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="valuation">Valuation</Label>
          <Input
            id="valuation"
            type="number"
            step="0.01"
            min="0"
            value={valuation}
            onChange={(e) => setValuation(e.target.value)}
            placeholder="0.00"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fiscalYearEnd">Fiscal Year End</Label>
          <Input
            id="fiscalYearEnd"
            type="date"
            value={fiscalYearEnd}
            onChange={(e) => setFiscalYearEnd(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>
    </GenericCrudForm>
  );
}
