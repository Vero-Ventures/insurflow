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
import {
  POLICY_TYPES,
  POLICY_TYPE_LABELS,
  POLICY_STATUSES,
  POLICY_STATUS_LABELS,
  type Policy,
  type PolicyType,
  type PolicyStatus,
} from "@/types/policy";

interface PolicyFormProps {
  clientId: string;
  item: Policy | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PolicyForm({
  clientId,
  item: policy,
  onSuccess,
  onCancel,
}: PolicyFormProps) {
  const [carrierName, setCarrierName] = useState(policy?.carrierName || "");
  const [policyNumber, setPolicyNumber] = useState(policy?.policyNumber || "");
  const [type, setType] = useState<PolicyType>(policy?.type || "term_life");
  const [faceAmount, setFaceAmount] = useState(
    policy?.faceAmount ? String(policy.faceAmount) : "",
  );
  const [annualPremium, setAnnualPremium] = useState(
    policy?.annualPremium ? String(policy.annualPremium) : "",
  );
  const [expiryDate, setExpiryDate] = useState(policy?.expiryDate || "");
  const [status, setStatus] = useState<PolicyStatus>(
    policy?.status || "active",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setCarrierName(policy?.carrierName || "");
    setPolicyNumber(policy?.policyNumber || "");
    setType(policy?.type || "term_life");
    setFaceAmount(policy?.faceAmount ? String(policy.faceAmount) : "");
    setAnnualPremium(policy?.annualPremium ? String(policy.annualPremium) : "");
    setExpiryDate(policy?.expiryDate || "");
    setStatus(policy?.status || "active");
  }, [policy]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!faceAmount) {
      toast.error("Please enter a face amount");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: Record<string, unknown> = {
        type,
        faceAmount,
        status,
      };

      // Optional fields
      if (carrierName.trim()) payload.carrierName = carrierName.trim();
      if (policyNumber.trim()) payload.policyNumber = policyNumber.trim();
      if (annualPremium) payload.annualPremium = annualPremium;
      if (expiryDate) payload.expiryDate = expiryDate;

      const url = policy
        ? `/api/clients/${clientId}/policies/${policy.id}`
        : `/api/clients/${clientId}/policies`;

      const method = policy ? "PATCH" : "POST";

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
            `Failed to ${policy ? "update" : "create"} policy`,
        );
      }

      toast.success(
        policy ? "Policy updated successfully" : "Policy created successfully",
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
      submitLabel={policy ? "Update" : "Create"}
    >
      <div className="space-y-4">
        {/* Row 1: Type and Status */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="type">Policy Type *</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as PolicyType)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Select policy type" />
              </SelectTrigger>
              <SelectContent>
                {POLICY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {POLICY_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as PolicyStatus)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {POLICY_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {POLICY_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Face Amount */}
        <div className="space-y-2">
          <Label htmlFor="faceAmount">Face Amount / Death Benefit *</Label>
          <Input
            id="faceAmount"
            type="number"
            step="0.01"
            min="0"
            value={faceAmount}
            onChange={(e) => setFaceAmount(e.target.value)}
            placeholder="0.00"
            disabled={isSubmitting}
          />
        </div>

        {/* Row 3: Carrier and Policy Number */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="carrierName">Carrier Name</Label>
            <Input
              id="carrierName"
              value={carrierName}
              onChange={(e) => setCarrierName(e.target.value)}
              placeholder="e.g., MetLife, Prudential"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="policyNumber">Policy Number</Label>
            <Input
              id="policyNumber"
              value={policyNumber}
              onChange={(e) => setPolicyNumber(e.target.value)}
              placeholder="Optional"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Row 4: Annual Premium and Expiry Date */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="annualPremium">Annual Premium</Label>
            <Input
              id="annualPremium"
              type="number"
              step="0.01"
              min="0"
              value={annualPremium}
              onChange={(e) => setAnnualPremium(e.target.value)}
              placeholder="Optional"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiryDate">
              Expiry Date {type === "term_life" && "(for term policies)"}
            </Label>
            <Input
              id="expiryDate"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>
    </GenericCrudForm>
  );
}
