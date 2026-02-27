import type { AuditAction, AuditEntityType } from "@/server/db/schemas";
import type { getDb } from "@/server/db";
import {
  asset,
  assetAllocation,
  beneficiary,
  business,
  client,
  corporateInsuranceNeed,
  debt,
  keyPerson,
  policy,
  shareholder,
} from "@/server/db/schemas";
import { eq, inArray } from "drizzle-orm";

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface AuditFilters {
  entityType?: AuditEntityType;
  entityId?: string;
  action?: AuditAction;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export function buildPaginationResponse<T>(
  data: T[],
  { page, limit }: PaginationParams,
  total: number,
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

type DbClient = Pick<ReturnType<typeof getDb>, "select">;
type IdRow = { id: string };

async function selectIds(query: Promise<IdRow[]>): Promise<string[]> {
  const rows = await query;
  return rows.map((row) => row.id);
}

async function selectIdsWhen(
  condition: boolean,
  query: Promise<IdRow[]>,
): Promise<string[]> {
  if (!condition) {
    return [];
  }

  return selectIds(query);
}

export async function getOwnedEntityIdsForAudit(
  db: DbClient,
  userId: string,
): Promise<string[]> {
  const clients = await db
    .select({ id: client.id })
    .from(client)
    .where(eq(client.userId, userId));
  const clientIds = clients.map((row) => row.id);

  if (clientIds.length === 0) {
    return [];
  }

  const [assetIds, debtIds, beneficiaryIds, policyIds, businessIds] =
    await Promise.all([
      selectIds(
        db
          .select({ id: asset.id })
          .from(asset)
          .where(inArray(asset.clientId, clientIds)) as Promise<IdRow[]>,
      ),
      selectIds(
        db
          .select({ id: debt.id })
          .from(debt)
          .where(inArray(debt.clientId, clientIds)) as Promise<IdRow[]>,
      ),
      selectIds(
        db
          .select({ id: beneficiary.id })
          .from(beneficiary)
          .where(inArray(beneficiary.clientId, clientIds)) as Promise<IdRow[]>,
      ),
      selectIds(
        db
          .select({ id: policy.id })
          .from(policy)
          .where(inArray(policy.clientId, clientIds)) as Promise<IdRow[]>,
      ),
      selectIds(
        db
          .select({ id: business.id })
          .from(business)
          .where(inArray(business.clientId, clientIds)) as Promise<IdRow[]>,
      ),
    ]);

  const [allocationIds, keyPersonIds, shareholderIds, insuranceNeedIds] =
    await Promise.all([
      selectIdsWhen(
        beneficiaryIds.length > 0,
        db
          .select({ id: assetAllocation.id })
          .from(assetAllocation)
          .where(
            inArray(assetAllocation.beneficiaryId, beneficiaryIds),
          ) as Promise<IdRow[]>,
      ),
      selectIdsWhen(
        businessIds.length > 0,
        db
          .select({ id: keyPerson.id })
          .from(keyPerson)
          .where(inArray(keyPerson.businessId, businessIds)) as Promise<
          IdRow[]
        >,
      ),
      selectIdsWhen(
        businessIds.length > 0,
        db
          .select({ id: shareholder.id })
          .from(shareholder)
          .where(inArray(shareholder.businessId, businessIds)) as Promise<
          IdRow[]
        >,
      ),
      selectIdsWhen(
        businessIds.length > 0,
        db
          .select({ id: corporateInsuranceNeed.id })
          .from(corporateInsuranceNeed)
          .where(
            inArray(corporateInsuranceNeed.businessId, businessIds),
          ) as Promise<IdRow[]>,
      ),
    ]);

  return [
    ...new Set([
      ...clientIds,
      ...assetIds,
      ...debtIds,
      ...beneficiaryIds,
      ...policyIds,
      ...businessIds,
      ...allocationIds,
      ...keyPersonIds,
      ...shareholderIds,
      ...insuranceNeedIds,
    ]),
  ];
}
