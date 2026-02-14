"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GenericCrudForm } from "@/components/crud/generic-crud-form";
import { toast } from "sonner";
import type { KeyPerson } from "@/types/business";

interface KeyPersonFormProps {
  clientId: string;
  businessId: string;
  item: KeyPerson | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function KeyPersonForm({
  clientId,
  businessId,
  item,
  onSuccess,
  onCancel,
}: KeyPersonFormProps) {
  const [name, setName] = useState(item?.name || "");
  const [role, setRole] = useState(item?.role || "");
  const [compensation, setCompensation] = useState(
    item?.compensation ? String(item.compensation) : "",
  );
  const [ownershipPercentage, setOwnershipPercentage] = useState(
    item?.ownershipPercentage ? String(item.ownershipPercentage) : "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName(item?.name || "");
    setRole(item?.role || "");
    setCompensation(item?.compensation ? String(item.compensation) : "");
    setOwnershipPercentage(
      item?.ownershipPercentage ? String(item.ownershipPercentage) : "",
    );
  }, [item]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim() || !role.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: Record<string, unknown> = {
        name: name.trim(),
        role: role.trim(),
      };

      if (compensation) {
        payload.compensation = String(compensation).replace(/,/g, "");
      }

      if (ownershipPercentage) {
        payload.ownershipPercentage = String(ownershipPercentage);
      }

      const url = item
        ? `/api/clients/${clientId}/businesses/${businessId}/key-people/${item.id}`
        : `/api/clients/${clientId}/businesses/${businessId}/key-people`;

      const method = item ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
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
          <Label htmlFor="kp-name">Name *</Label>
          <Input
            id="kp-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Jane Smith"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="kp-role">Role *</Label>
          <Input
            id="kp-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g., CEO, CTO"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="kp-compensation">Annual Compensation</Label>
          <Input
            id="kp-compensation"
            type="number"
            step="0.01"
            min="0"
            value={compensation}
            onChange={(e) => setCompensation(e.target.value)}
            placeholder="0.00"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="kp-ownership">Ownership %</Label>
          <Input
            id="kp-ownership"
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
