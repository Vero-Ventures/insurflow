"use client";

import { Users } from "lucide-react";
import { EntitySection } from "@/components/crud/entity-section";
import { KeyPeopleList } from "@/components/clients/key-people-list";
import { KeyPersonForm } from "@/components/clients/key-person-form";
import type { KeyPerson } from "@/types/business";

interface KeyPeopleSectionProps {
  clientId: string;
  businessId: string;
}

export function KeyPeopleSection({
  clientId,
  businessId,
}: KeyPeopleSectionProps) {
  return (
    <EntitySection<KeyPerson>
      title="Key People"
      description="Key personnel critical to business operations"
      addLabel="Add Key Person"
      entityName="Key Person"
      icon={Users}
      clientId={clientId}
      businessId={businessId}
      apiPath="key-people"
      ListComponent={KeyPeopleList}
      FormComponent={KeyPersonForm}
    />
  );
}
