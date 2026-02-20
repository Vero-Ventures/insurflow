import { getDb } from "@/server/db";
import {
  asset,
  beneficiary,
  business,
  client,
  debt,
  policy,
} from "@/server/db/schemas";
import { and, eq, exists, isNull, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { Logger } from "@/server/axiom";

type ResourceTable =
  | typeof asset
  | typeof debt
  | typeof beneficiary
  | typeof business
  | typeof policy;

/**
 * Creates the ownership verification EXISTS subquery.
 * Ensures client belongs to user and is not deleted.
 *
 * Used in atomic UPDATE/DELETE statements to prevent TOCTOU race conditions.
 */
export function createOwnershipCheck(
  db: ReturnType<typeof getDb>,
  clientId: string,
  userId: string,
) {
  return exists(
    db
      .select({ id: client.id })
      .from(client)
      .where(
        and(
          eq(client.id, clientId),
          eq(client.userId, userId),
          isNull(client.deletedAt),
        ),
      ),
  );
}

/**
 * Configuration for resource CRUD operations
 */
export interface ResourceConfig {
  /** The Drizzle table definition */
  table: ResourceTable;
  /** Display name for error messages (e.g., "Asset", "Debt") */
  resourceName: string;
  /** Query key for db.query (e.g., "asset", "debt") */
  queryKey: "asset" | "debt" | "beneficiary" | "business" | "policy";
}

/**
 * Result of a resource operation
 */
export type ResourceResult<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse };

/**
 * Creates base WHERE conditions for a resource query.
 */
function createBaseWhere(
  table: ResourceTable,
  resourceId: string,
  clientId: string,
): SQL {
  return and(
    eq(table.id, resourceId),
    eq(table.clientId, clientId),
    isNull(table.deletedAt),
  )!;
}

/**
 * Checks if a resource exists (without ownership verification).
 */
async function resourceExists(
  db: ReturnType<typeof getDb>,
  queryKey: "asset" | "debt" | "beneficiary" | "business" | "policy",
  where: SQL,
): Promise<boolean> {
  // Use separate calls to avoid TypeScript union type callable issue
  if (queryKey === "asset") {
    const result = await db.query.asset.findFirst({ where });
    return !!result;
  } else if (queryKey === "debt") {
    const result = await db.query.debt.findFirst({ where });
    return !!result;
  } else if (queryKey === "business") {
    const result = await db.query.business.findFirst({ where });
    return !!result;
  } else if (queryKey === "policy") {
    const result = await db.query.policy.findFirst({ where });
    return !!result;
  } else {
    const result = await db.query.beneficiary.findFirst({ where });
    return !!result;
  }
}

/**
 * Updates a client-owned resource with TOCTOU-safe ownership verification.
 *
 * Pattern:
 * 1. Check if resource exists (to distinguish 404 from 403)
 * 2. Perform atomic UPDATE with EXISTS subquery for ownership
 * 3. Return 403 if ownership check fails (resource was reassigned)
 *
 * @example
 * ```ts
 * const result = await updateResource({
 *   config: { table: asset, resourceName: "Asset", queryKey: "asset" },
 *   resourceId: assetId,
 *   clientId,
 *   userId: session.user.id,
 *   updateData: validationResult.data,
 *   logger,
 * });
 *
 * if (!result.success) return result.response;
 * return { data: { asset: result.data } };
 * ```
 */
export async function updateResource<TData extends Record<string, unknown>>({
  config,
  resourceId,
  clientId,
  userId,
  updateData,
  logger,
}: {
  config: ResourceConfig;
  resourceId: string;
  clientId: string;
  userId: string;
  updateData: TData;
  logger: Logger;
}): Promise<ResourceResult<Record<string, unknown>>> {
  const db = getDb();
  const { table, resourceName, queryKey } = config;

  // Base WHERE conditions (DRY between existence check and update)
  const baseWhere = createBaseWhere(table, resourceId, clientId);

  // First check if resource exists (to distinguish "not found" from "ownership failed")
  const exists = await resourceExists(db, queryKey, baseWhere);

  if (!exists) {
    await logger.info(`${resourceName} not found`, { statusCode: 404 });
    return {
      success: false,
      response: NextResponse.json(
        { error: `${resourceName} not found` },
        { status: 404 },
      ),
    };
  }

  // Update resource with atomic ownership verification via EXISTS subquery
  // This prevents TOCTOU race condition by checking ownership in the same statement
  const dataWithTimestamp: Record<string, unknown> = {
    ...updateData,
    updatedAt: new Date(),
  };

  const [updatedResource] = await db
    .update(table)
    .set(dataWithTimestamp)
    .where(and(baseWhere, createOwnershipCheck(db, clientId, userId)))
    .returning();

  if (!updatedResource) {
    // Resource exists but ownership check failed
    await logger.warn("Client ownership verification failed during update", {
      statusCode: 403,
    });
    return {
      success: false,
      response: NextResponse.json(
        { error: "Client not found or access denied" },
        { status: 403 },
      ),
    };
  }

  await logger.info(`${resourceName} updated successfully`);
  return { success: true, data: updatedResource };
}

/**
 * Soft deletes a client-owned resource with TOCTOU-safe ownership verification.
 *
 * Pattern:
 * 1. Check if resource exists (to distinguish 404 from 403)
 * 2. Perform atomic UPDATE (soft delete) with EXISTS subquery for ownership
 * 3. Return 403 if ownership check fails (resource was reassigned)
 *
 * @example
 * ```ts
 * const result = await deleteResource({
 *   config: { table: asset, resourceName: "Asset", queryKey: "asset" },
 *   resourceId: assetId,
 *   clientId,
 *   userId: session.user.id,
 *   logger,
 * });
 *
 * if (!result.success) return result.response;
 * return { data: { message: "Asset deleted successfully" } };
 * ```
 */
export async function deleteResource({
  config,
  resourceId,
  clientId,
  userId,
  logger,
}: {
  config: ResourceConfig;
  resourceId: string;
  clientId: string;
  userId: string;
  logger: Logger;
}): Promise<ResourceResult<Record<string, unknown>>> {
  const db = getDb();
  const { table, resourceName, queryKey } = config;

  // Base WHERE conditions (DRY between existence check and delete)
  const baseWhere = createBaseWhere(table, resourceId, clientId);

  // First check if resource exists (to distinguish "not found" from "ownership failed")
  const resourceExistsResult = await resourceExists(db, queryKey, baseWhere);

  if (!resourceExistsResult) {
    await logger.info(`${resourceName} not found or already deleted`, {
      statusCode: 404,
    });
    return {
      success: false,
      response: NextResponse.json(
        { error: `${resourceName} not found` },
        { status: 404 },
      ),
    };
  }

  const now = new Date();

  // Soft delete with atomic ownership verification via EXISTS subquery
  // This prevents TOCTOU race condition by checking ownership in the same statement
  const [deletedResource] = await db
    .update(table)
    .set({
      deletedAt: now,
      updatedAt: now,
    })
    .where(and(baseWhere, createOwnershipCheck(db, clientId, userId)))
    .returning();

  if (!deletedResource) {
    // Resource exists but ownership check failed
    await logger.warn("Client ownership verification failed during delete", {
      statusCode: 403,
    });
    return {
      success: false,
      response: NextResponse.json(
        { error: "Client not found or access denied" },
        { status: 403 },
      ),
    };
  }

  await logger.info(`${resourceName} deleted successfully`);
  return { success: true, data: deletedResource };
}

// Pre-configured helpers for common resources
export const assetConfig: ResourceConfig = {
  table: asset,
  resourceName: "Asset",
  queryKey: "asset",
};

export const debtConfig: ResourceConfig = {
  table: debt,
  resourceName: "Debt",
  queryKey: "debt",
};

export const beneficiaryConfig: ResourceConfig = {
  table: beneficiary,
  resourceName: "Beneficiary",
  queryKey: "beneficiary",
};

export const businessConfig: ResourceConfig = {
  table: business,
  resourceName: "Business",
  queryKey: "business",
};

export const policyConfig: ResourceConfig = {
  table: policy,
  resourceName: "Policy",
  queryKey: "policy",
};
