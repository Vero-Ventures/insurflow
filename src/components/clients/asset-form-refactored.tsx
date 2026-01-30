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
import type { Asset } from "@/types/asset";

const ASSET_TYPES = [
  { value: "rrsp", label: "RRSP" },
  { value: "tfsa", label: "TFSA" },
  { value: "non_registered", label: "Non-Registered" },
  { value: "rrif", label: "RRIF" },
  { value: "lira", label: "LIRA" },
  { value: "lif", label: "LIF" },
  { value: "real_estate", label: "Real Estate" },
  { value: "life_insurance", label: "Life Insurance" },
  { value: "business_interest", label: "Business Interest" },
  { value: "pension", label: "Pension" },
  { value: "stock_options", label: "Stock Options" },
  { value: "cryptocurrency", label: "Cryptocurrency" },
  { value: "collectibles", label: "Collectibles" },
  { value: "other", label: "Other" },
];

interface AssetFormRefactoredProps {
  clientId: string;
  item: Asset | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AssetFormRefactored({
  clientId,
  item,
  onSuccess,
  onCancel,
}: AssetFormRefactoredProps) {
  const [name, setName] = useState(item?.name || "");
  const [type, setType] = useState(item?.type || "");
  const [currentValue, setCurrentValue] = useState(
    item?.currentValue ? String(item.currentValue) : "",
  );
  const [isLiquid, setIsLiquid] = useState(item?.isLiquid || false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName(item?.name || "");
    setType(item?.type || "");
    setCurrentValue(item?.currentValue ? String(item.currentValue) : "");
    setIsLiquid(item?.isLiquid || false);
  }, [item]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim() || !type || !currentValue) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        name: name.trim(),
        type,
        currentValue: String(currentValue).replace(/,/g, ""),
        isLiquid,
      };

      const url = item
        ? `/api/clients/${clientId}/assets/${item.id}`
        : `/api/clients/${clientId}/assets`;

      const method = item ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = `Failed to ${item ? "update" : "create"} asset`;
        try {
          const error = await response.json();
          message = error.error || error.message || message;
        } catch {
          // ignore json parse errors
        }
        throw new Error(message);
      }

      toast.success(
        item ? "Asset updated successfully" : "Asset created successfully",
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
        <div>
          <Label htmlFor="name">Asset Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Primary Residence, Investment Portfolio"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <Label htmlFor="type">Asset Type *</Label>
          <Select value={type} onValueChange={setType} disabled={isSubmitting}>
            <SelectTrigger id="type">
              <SelectValue placeholder="Select asset type" />
            </SelectTrigger>
            <SelectContent>
              {ASSET_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="value">Current Value (CAD) *</Label>
          <Input
            id="value"
            type="number"
            step="0.01"
            min="0"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            placeholder="0.00"
            disabled={isSubmitting}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="liquid"
            checked={isLiquid}
            onChange={(e) => setIsLiquid(e.target.checked)}
            disabled={isSubmitting}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="liquid" className="mb-0 cursor-pointer">
            This is a liquid asset
          </Label>
        </div>
      </div>
    </GenericCrudForm>
  );
}
