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
import { Textarea } from "@/components/ui/textarea";
import { GenericCrudForm } from "@/components/crud/generic-crud-form";
import { toast } from "sonner";
import {
  BENEFICIARY_RELATIONSHIPS,
  BENEFICIARY_RELATIONSHIP_LABELS,
} from "@/lib/validation/beneficiary";
import type { Beneficiary } from "@/types/beneficiary";

interface BeneficiaryFormProps {
  clientId: string;
  item: Beneficiary | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BeneficiaryForm({
  clientId,
  item: beneficiary,
  onSuccess,
  onCancel,
}: BeneficiaryFormProps) {
  const [firstName, setFirstName] = useState(beneficiary?.firstName || "");
  const [lastName, setLastName] = useState(beneficiary?.lastName || "");
  const [dateOfBirth, setDateOfBirth] = useState(
    beneficiary?.dateOfBirth || "",
  );
  const [relationship, setRelationship] = useState(
    beneficiary?.relationship || "",
  );
  const [isPrimary, setIsPrimary] = useState(beneficiary?.isPrimary ?? true);
  const [notes, setNotes] = useState(beneficiary?.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFirstName(beneficiary?.firstName || "");
    setLastName(beneficiary?.lastName || "");
    setDateOfBirth(beneficiary?.dateOfBirth || "");
    setRelationship(beneficiary?.relationship || "");
    setIsPrimary(beneficiary?.isPrimary ?? true);
    setNotes(beneficiary?.notes || "");
  }, [beneficiary]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !relationship) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth: dateOfBirth || null,
        relationship,
        isPrimary,
        notes: notes.trim() || null,
      };

      const url = beneficiary
        ? `/api/clients/${clientId}/beneficiaries/${beneficiary.id}`
        : `/api/clients/${clientId}/beneficiaries`;

      const method = beneficiary ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            errorData.message ||
            `Failed to ${beneficiary ? "update" : "create"} beneficiary`,
        );
      }

      toast.success(
        beneficiary
          ? "Beneficiary updated successfully"
          : "Beneficiary created successfully",
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
      submitLabel={beneficiary ? "Update" : "Create"}
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="John"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="relationship">Relationship *</Label>
          <Select
            value={relationship}
            onValueChange={setRelationship}
            disabled={isSubmitting}
          >
            <SelectTrigger id="relationship">
              <SelectValue placeholder="Select relationship" />
            </SelectTrigger>
            <SelectContent>
              {BENEFICIARY_RELATIONSHIPS.map((rel) => (
                <SelectItem key={rel} value={rel}>
                  {BENEFICIARY_RELATIONSHIP_LABELS[rel]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of Birth (optional)</Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="isPrimary"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
            disabled={isSubmitting}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label
            htmlFor="isPrimary"
            className="mb-0 cursor-pointer font-normal"
          >
            Primary beneficiary (vs contingent)
          </Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes about this beneficiary..."
            disabled={isSubmitting}
            rows={3}
          />
        </div>
      </div>
    </GenericCrudForm>
  );
}
