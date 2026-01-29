"use client";

import { useState } from "react";
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
import { DEBT_TYPE_OPTIONS } from "@/lib/validation/debt";
import type { Debt } from "../../types/debt";

interface DebtFormRefactoredProps {
  clientId: string;
  item: Debt | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DebtFormRefactored({
  clientId,
  item: debt,
  onSuccess,
  onCancel,
}: DebtFormRefactoredProps) {
  const [name, setName] = useState(debt?.name || "");
  const [type, setType] = useState(debt?.type || "");
  const [currentBalance, setCurrentBalance] = useState(
    debt?.currentBalance ? String(debt.currentBalance) : "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim() || !type || !currentBalance) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        name: name.trim(),
        type,
        currentBalance,
      };

      const url = debt
        ? `/api/clients/${clientId}/debts/${debt.id}`
        : `/api/clients/${clientId}/debts`;

      const method = debt ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.message || `Failed to ${debt ? "update" : "create"} debt`,
        );
      }

      toast.success(
        debt ? "Debt updated successfully" : "Debt created successfully",
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
      submitLabel={debt ? "Update" : "Create"}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Debt Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Home Mortgage, Car Loan"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <Label htmlFor="type">Debt Type *</Label>
          <Select value={type} onValueChange={setType} disabled={isSubmitting}>
            <SelectTrigger id="type">
              <SelectValue placeholder="Select debt type" />
            </SelectTrigger>
            <SelectContent>
              {DEBT_TYPE_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="balance">Current Balance (CAD) *</Label>
          <Input
            id="balance"
            type="number"
            step="0.01"
            min="0"
            value={currentBalance}
            onChange={(e) => setCurrentBalance(e.target.value)}
            placeholder="0.00"
            disabled={isSubmitting}
          />
        </div>
      </div>
    </GenericCrudForm>
  );
}
