import { and, eq, isNull } from "drizzle-orm";

import type {
  EstimateRangeInput,
  PremiumRangeEstimate,
} from "@/lib/providers/carrier-provider";
import {
  getCarrierProvider,
  listProviderIds,
} from "@/lib/providers/carrier-registry";
import { getDb } from "@/server/db";
import { client } from "@/server/db/schemas";

type ComparisonClientRow = {
  id: string;
  state: string;
  dateOfBirth: string;
  smoker: boolean;
  existingLifeInsuranceCoverage: string;
  replacementDurationYears: number;
};

export type ComparisonMissingField =
  | "province"
  | "dateOfBirth"
  | "coverageAmount"
  | "termYears";

export interface CarrierComparisonOption {
  providerKey: string;
  premiumRange: PremiumRangeEstimate;
}

export type AdvisorCarrierComparisonResult =
  | { found: false }
  | {
      found: true;
      ready: false;
      missingFields: ComparisonMissingField[];
    }
  | {
      found: true;
      ready: true;
      request: EstimateRangeInput;
      options: CarrierComparisonOption[];
    };

export async function findAdvisorCarrierComparison(
  clientId: string,
  userId: string,
  asOfDate = new Date(),
): Promise<AdvisorCarrierComparisonResult> {
  const db = getDb();

  const row = (await db.query.client.findFirst({
    where: and(
      eq(client.id, clientId),
      eq(client.userId, userId),
      isNull(client.deletedAt),
    ),
    columns: {
      id: true,
      state: true,
      dateOfBirth: true,
      smoker: true,
      existingLifeInsuranceCoverage: true,
      replacementDurationYears: true,
    },
  })) as ComparisonClientRow | null;

  if (!row) {
    return { found: false };
  }

  const missingFields = getMissingFields(row);
  if (missingFields.length > 0) {
    return {
      found: true,
      ready: false,
      missingFields,
    };
  }

  const request: EstimateRangeInput = {
    province: row.state,
    age: calculateAge(row.dateOfBirth, asOfDate),
    tobaccoUse: row.smoker,
    coverageAmount: Number.parseFloat(row.existingLifeInsuranceCoverage),
    termYears: row.replacementDurationYears,
  };

  const options: CarrierComparisonOption[] = [];
  for (const providerId of listProviderIds()) {
    const provider = getCarrierProvider(providerId);
    if (!provider?.getEstimateRange) {
      continue;
    }

    const premiumRange = await provider.getEstimateRange(request);
    options.push({
      providerKey: provider.providerId,
      premiumRange,
    });
  }

  return {
    found: true,
    ready: true,
    request,
    options,
  };
}

function getMissingFields(row: ComparisonClientRow): ComparisonMissingField[] {
  const missing: ComparisonMissingField[] = [];

  if (!row.state.trim()) {
    missing.push("province");
  }

  if (!row.dateOfBirth.trim() || Number.isNaN(Date.parse(row.dateOfBirth))) {
    missing.push("dateOfBirth");
  }

  const coverageAmount = Number.parseFloat(row.existingLifeInsuranceCoverage);
  if (!Number.isFinite(coverageAmount) || coverageAmount <= 0) {
    missing.push("coverageAmount");
  }

  if (
    !Number.isFinite(row.replacementDurationYears) ||
    row.replacementDurationYears <= 0
  ) {
    missing.push("termYears");
  }

  return missing;
}

function calculateAge(dateOfBirth: string, asOfDate: Date): number {
  const dob = new Date(`${dateOfBirth}T00:00:00.000Z`);

  let age = asOfDate.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = asOfDate.getUTCMonth() - dob.getUTCMonth();
  const dayDelta = asOfDate.getUTCDate() - dob.getUTCDate();

  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
    age -= 1;
  }

  return age;
}
