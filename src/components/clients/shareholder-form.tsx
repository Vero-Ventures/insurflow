"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GenericCrudForm } from "@/components/crud/generic-crud-form";
import { toast } from "sonner";
import type { Shareholder } from "@/types/shareholder";

interface ShareholderFormProps {
  clientId: string;
  businessId: string;
  item: Shareholder | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ShareholderForm({
  clientId,
  businessId,
  item,
  onSuccess,
  onCancel,
}: ShareholderFormProps) {
  const [name, setName] = useState(item?.name || "");
  const [ownershipPercentage, setOwnershipPercentage] = useState(
    item?.ownershipPercentage ? String(item.ownershipPercentage) : "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName(item?.name || "");
    setOwnershipPercentage(
      item?.ownershipPercentage ? String(item.ownershipPercentage) : "",
    );
  }, [item]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim() || !ownershipPercentage) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        name: name.trim(),
        ownershipPercentage: String(ownershipPercentage),
      };

      const url = item
        ? `/api/clients/${clientId}/businesses/${businessId}/shareholders/${item.id}`
        : `/api/clients/${clientId}/businesses/${businessId}/shareholders`;

      const method = item ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
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
          <Label htmlFor="sh-name">Shareholder Name *</Label>
          <Input
            id="sh-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., John Doe"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sh-ownership">Ownership % *</Label>
          <Input
            id="sh-ownership"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={ownershipPercentage}
            onChange={(e) => setOwnershipPercentage(e.target.value)}
            placeholder="0.00"
            disabled={isSubmitting}
          />
        </div>
      </div>
    </GenericCrudForm>
  );
}
