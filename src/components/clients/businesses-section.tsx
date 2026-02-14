"use client";

import { GenericCrudSection } from "@/components/crud/generic-crud-section";
import { BusinessesList } from "@/components/clients/businesses-list";
import { BusinessForm } from "@/components/clients/business-form";
import { Building2 } from "lucide-react";
import type { Business } from "@/types/business";

interface BusinessesSectionProps {
  clientId: string;
  onBusinessSelect?: (business: Business) => void;
}

export function BusinessesSection({
  clientId,
  onBusinessSelect,
}: BusinessesSectionProps) {
  return (
    <GenericCrudSection<Business>
      config={{
        title: "Businesses",
        itemName: "Business",
        description:
          "Manage business entities, ownership structures, and corporate insurance needs",
        createButtonLabel: "Add Business",
        fetchEndpoint: `/api/clients/${clientId}/businesses`,
        emptyMessage:
          "No businesses found. Add your first business to get started.",
        icon: Building2,
      }}
      ListComponent={(props) => (
        <BusinessesList {...props} onSelect={onBusinessSelect} />
      )}
      FormComponent={BusinessForm}
      clientId={clientId}
    />
  );
}
