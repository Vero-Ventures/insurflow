"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Asset } from "@/types/asset";

interface AssetFormProps {
  clientId: string;
  asset?: Asset | null;
  onSuccess: () => void;
  onCancel: () => void;
}

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

export function AssetForm({
  clientId,
  asset,
  onSuccess,
  onCancel,
}: AssetFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(asset?.name ?? "");
  const [type, setType] = useState(asset?.type ?? "");
  const [currentValue, setCurrentValue] = useState(asset?.currentValue ?? "");
  const [isLiquid, setIsLiquid] = useState(asset?.isLiquid ?? false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = asset
        ? `/api/clients/${clientId}/assets/${asset.id}`
        : `/api/clients/${clientId}/assets`;
      const method = asset ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          currentValue,
          isLiquid,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save asset");
      }

      toast.success(
        asset ? "Asset updated successfully" : "Asset created successfully",
      );
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save asset",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Asset Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Primary Residence"
          required
          maxLength={255}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Asset Type</Label>
        <Select value={type} onValueChange={setType} required>
          <SelectTrigger id="type">
            <SelectValue placeholder="Select asset type" />
          </SelectTrigger>
          <SelectContent>
            {ASSET_TYPES.map((assetType) => (
              <SelectItem key={assetType.value} value={assetType.value}>
                {assetType.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="currentValue">Current Value (CAD)</Label>
        <Input
          id="currentValue"
          type="number"
          step="0.01"
          min="0"
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          placeholder="0.00"
          required
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          id="isLiquid"
          type="checkbox"
          checked={isLiquid}
          onChange={(e) => setIsLiquid(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <Label htmlFor="isLiquid" className="cursor-pointer">
          Liquid Asset (easily convertible to cash)
        </Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : asset ? "Update Asset" : "Create Asset"}
        </Button>
      </div>
    </form>
  );
}
