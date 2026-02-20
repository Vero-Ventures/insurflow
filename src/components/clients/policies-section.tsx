"use client";

import { GenericCrudSection } from "@/components/crud/generic-crud-section";
import { PoliciesList } from "@/components/clients/policies-list";
import { PolicyForm } from "@/components/clients/policy-form";
import { PoliciesSummary } from "@/components/clients/policies-summary";
import { Shield } from "lucide-react";
import type { Policy } from "@/types/policy";

interface PoliciesSectionProps {
  clientId: string;
}

export function PoliciesSection({ clientId }: PoliciesSectionProps) {
  return (
    <GenericCrudSection<Policy>
      config={{
        title: "Existing Life Insurance Policies",
        itemName: "Policy",
        description:
          "Track existing life insurance policies to calculate coverage gap",
        createButtonLabel: "Add Policy",
        fetchEndpoint: `/api/clients/${clientId}/policies`,
        emptyMessage:
          "No policies recorded. Add existing life insurance policies to track coverage.",
        icon: Shield,
      }}
      ListComponent={PoliciesList}
      FormComponent={PolicyForm}
      SummaryComponent={PoliciesSummary}
      clientId={clientId}
    />
  );
}
