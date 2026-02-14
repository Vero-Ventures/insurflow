"use client";

import { ShieldCheck } from "lucide-react";
import { EntitySection } from "@/components/crud/entity-section";
import { InsuranceNeedsList } from "@/components/clients/insurance-needs-list";
import { InsuranceNeedForm } from "@/components/clients/insurance-need-form";
import type { CorporateInsuranceNeed } from "@/types/business";

interface InsuranceNeedsSectionProps {
  clientId: string;
  businessId: string;
}

export function InsuranceNeedsSection({
  clientId,
  businessId,
}: InsuranceNeedsSectionProps) {
  return (
    <EntitySection<CorporateInsuranceNeed>
      title="Insurance Needs"
      description="Corporate insurance requirements and coverage analysis"
      addLabel="Add Insurance Need"
      entityName="Insurance Need"
      icon={ShieldCheck}
      clientId={clientId}
      businessId={businessId}
      apiPath="insurance-needs"
      ListComponent={InsuranceNeedsList}
      FormComponent={InsuranceNeedForm}
    />
  );
}
