"use client";

import type { Client } from "@/types/client";
import { useFinancialInputs } from "@/lib/hooks/use-financial-inputs";
import { FinancialInputsDisplay } from "./financial-inputs-display";
import { FinancialInputsEdit } from "./financial-inputs-edit";

interface FinancialInputsFormProps {
  client: Client;
  onUpdate: (updatedClient: Client) => Promise<void>;
}

/**
 * Container component for financial inputs form
 * Manages state and renders display or edit mode
 */
export function FinancialInputsForm({
  client,
  onUpdate,
}: FinancialInputsFormProps) {
  const {
    isEditing,
    setIsEditing,
    isSaving,
    formData,
    handleInputChange,
    handleSave,
    handleCancel,
  } = useFinancialInputs(client);

  if (!isEditing) {
    return (
      <FinancialInputsDisplay
        client={client}
        onEdit={() => setIsEditing(true)}
      />
    );
  }

  return (
    <FinancialInputsEdit
      formData={formData}
      isSaving={isSaving}
      onInputChange={handleInputChange}
      onSave={() => handleSave(onUpdate)}
      onCancel={handleCancel}
    />
  );
}
