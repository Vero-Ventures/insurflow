"use client";

import { GenericCrudSection } from "@/components/crud/generic-crud-section";
import { DebtsListRefactored } from "@/components/clients/debts-list-refactored";
import { DebtFormRefactored } from "@/components/clients/debt-form-refactored";
import type { Debt } from "@/types/debt";

interface DebtsSectionRefactoredProps {
  clientId: string;
  totalAssets?: number;
}

export function DebtsSectionRefactored({
  clientId,
  totalAssets = 0,
}: DebtsSectionRefactoredProps) {
  return (
    <GenericCrudSection<Debt>
      config={{
        title: "Debts",
        description: "Track and manage client liabilities",
        createButtonLabel: "Add Debt",
        fetchEndpoint: `/api/clients/${clientId}/debts`,
        emptyMessage: "No debts recorded.",
      }}
      ListComponent={DebtsListRefactored}
      FormComponent={DebtFormRefactored}
      clientId={clientId}
    />
  );
}
