import { useState } from "react";
import { toast } from "sonner";
import type { Client } from "@/types/client";

export interface FinancialInputsData {
  clientIncome: string;
  spouseIncome: string;
  incomeReplacementPercent: string;
  replacementDurationYears: number;
  existingLifeInsuranceCoverage: string;
  additionalGoals: string;
}

/**
 * Custom hook for managing financial inputs form state and API interactions
 */
export function useFinancialInputs(client: Client) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FinancialInputsData>({
    clientIncome: client.clientIncome || "0",
    spouseIncome: client.spouseIncome || "",
    incomeReplacementPercent: client.incomeReplacementPercent || "70",
    replacementDurationYears: client.replacementDurationYears || 10,
    existingLifeInsuranceCoverage: client.existingLifeInsuranceCoverage || "0",
    additionalGoals: client.additionalGoals || "",
  });

  const handleInputChange = (
    field: keyof FinancialInputsData,
    value: string | number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = (): boolean => {
    const clientIncomeNum = parseFloat(formData.clientIncome);
    const replacementPercent = parseFloat(formData.incomeReplacementPercent);

    if (isNaN(clientIncomeNum) || clientIncomeNum < 0) {
      toast.error("Client income must be a valid number");
      return false;
    }

    if (replacementPercent < 0 || replacementPercent > 100) {
      toast.error("Replacement percentage must be between 0 and 100");
      return false;
    }

    // Validate optional spouse income if provided
    if (formData.spouseIncome) {
      const spouseIncomeNum = parseFloat(formData.spouseIncome);
      if (isNaN(spouseIncomeNum) || spouseIncomeNum < 0) {
        toast.error("Spouse income must be a valid number");
        return false;
      }
    }

    // Validate existing life insurance coverage
    const coverageNum = parseFloat(formData.existingLifeInsuranceCoverage);
    if (isNaN(coverageNum) || coverageNum < 0) {
      toast.error("Existing life insurance coverage must be a valid number");
      return false;
    }

    return true;
  };

  const handleSave = async (
    onUpdate: (updatedClient: Client) => Promise<void>,
  ) => {
    try {
      setIsSaving(true);

      if (!validateForm()) {
        setIsSaving(false);
        return;
      }

      const updatePayload = {
        clientIncome: formData.clientIncome,
        ...(formData.spouseIncome && { spouseIncome: formData.spouseIncome }),
        incomeReplacementPercent: formData.incomeReplacementPercent,
        replacementDurationYears: formData.replacementDurationYears,
        existingLifeInsuranceCoverage: formData.existingLifeInsuranceCoverage,
        ...(formData.additionalGoals && {
          additionalGoals: formData.additionalGoals,
        }),
      };

      const response = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update client");
      }

      const data = await response.json();
      await onUpdate(data.client);
      setIsEditing(false);
      toast.success("Financial inputs saved successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save financial inputs",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      clientIncome: client.clientIncome || "0",
      spouseIncome: client.spouseIncome || "",
      incomeReplacementPercent: client.incomeReplacementPercent || "70",
      replacementDurationYears: client.replacementDurationYears || 10,
      existingLifeInsuranceCoverage:
        client.existingLifeInsuranceCoverage || "0",
      additionalGoals: client.additionalGoals || "",
    });
    setIsEditing(false);
  };

  return {
    isEditing,
    setIsEditing,
    isSaving,
    formData,
    handleInputChange,
    handleSave,
    handleCancel,
  };
}
