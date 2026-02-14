"use client";

import { PieChart } from "lucide-react";
import { EntitySection } from "@/components/crud/entity-section";
import { ShareholdersList } from "@/components/clients/shareholders-list";
import { ShareholderForm } from "@/components/clients/shareholder-form";
import type { Shareholder } from "@/types/shareholder";

interface ShareholdersSectionProps {
  clientId: string;
  businessId: string;
}

export function ShareholdersSection({
  clientId,
  businessId,
}: ShareholdersSectionProps) {
  return (
    <EntitySection<Shareholder>
      title="Shareholders"
      description="Ownership structure and equity distribution"
      addLabel="Add Shareholder"
      entityName="Shareholder"
      icon={PieChart}
      clientId={clientId}
      businessId={businessId}
      apiPath="shareholders"
      ListComponent={ShareholdersList}
      FormComponent={ShareholderForm}
    />
  );
}
