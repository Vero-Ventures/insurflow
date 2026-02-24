import { getDb } from "@/server/db";
import {
  asset,
  beneficiary,
  business,
  client,
  debt,
  keyPerson,
  corporateInsuranceNeed,
  policy,
  shareholder,
} from "@/server/db/schemas";
import type { AuditEntityType } from "@/server/db/schemas";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { UUID_REGEX } from "@/lib/validation/client";

/**
 * Validates UUID format and returns 400 response if invalid
 */
export function validateUUID(
  id: string,
  fieldName = "ID",
): NextResponse | null {
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: `Invalid ${fieldName} format` },
      { status: 400 },
    );
  }
  return null;
}

/**
 * Verifies that a client exists and belongs to the specified user
 * @returns The client if found, null otherwise
 */
export async function verifyClientOwnership(clientId: string, userId: string) {
  const db = getDb();

  const foundClient = await db.query.client.findFirst({
    where: and(
      eq(client.id, clientId),
      eq(client.userId, userId),
      isNull(client.deletedAt),
    ),
  });

  return foundClient;
}

/**
 * Verifies that a business exists and belongs to the specified client
 * @returns The business if found, null otherwise
 */
export async function verifyBusinessOwnership(
  businessId: string,
  clientId: string,
) {
  const db = getDb();

  const foundBusiness = await db.query.business.findFirst({
    where: and(
      eq(business.id, businessId),
      eq(business.clientId, clientId),
      isNull(business.deletedAt),
    ),
  });

  return foundBusiness;
}

/**
 * Entity types that are directly owned by clients (have clientId field)
 */
const CLIENT_OWNED_ENTITIES: AuditEntityType[] = [
  "asset",
  "debt",
  "beneficiary",
  "business",
  "policy",
];

/**
 * Entity types owned through business (have businessId -> clientId)
 */
const BUSINESS_OWNED_ENTITIES: AuditEntityType[] = [
  "key_person",
  "shareholder",
  "corporate_insurance_need",
];

/**
 * Verifies that the user has access to view audit logs for a specific entity.
 *
 * Authorization rules:
 * - client: user must own the client (client.userId === userId)
 * - asset, debt, beneficiary, business, policy: user must own the parent client
 * - key_person, shareholder, corporate_insurance_need: user must own the business's client
 * - asset_allocation: user must own the parent beneficiary's client
 * - user_profile: user can only access their own profile changes
 *
 * @returns true if authorized, false otherwise
 */
export async function verifyAuditEntityAccess(
  entityType: AuditEntityType,
  entityId: string,
  userId: string,
): Promise<boolean> {
  const db = getDb();

  // User profile: can only see own changes
  if (entityType === "user_profile") {
    return entityId === userId;
  }

  // Client: direct ownership check
  if (entityType === "client") {
    const foundClient = await db.query.client.findFirst({
      where: and(eq(client.id, entityId), eq(client.userId, userId)),
      columns: { id: true },
    });
    return !!foundClient;
  }

  // Entities directly owned by client
  if (CLIENT_OWNED_ENTITIES.includes(entityType)) {
    const clientId = await getClientIdForEntity(entityType, entityId);
    if (!clientId) return false;

    const foundClient = await db.query.client.findFirst({
      where: and(eq(client.id, clientId), eq(client.userId, userId)),
      columns: { id: true },
    });
    return !!foundClient;
  }

  // Entities owned through business
  if (BUSINESS_OWNED_ENTITIES.includes(entityType)) {
    const businessId = await getBusinessIdForEntity(entityType, entityId);
    if (!businessId) return false;

    // Look up business -> client -> verify ownership
    const foundBusiness = await db.query.business.findFirst({
      where: eq(business.id, businessId),
      columns: { clientId: true },
    });
    if (!foundBusiness) return false;

    const foundClient = await db.query.client.findFirst({
      where: and(
        eq(client.id, foundBusiness.clientId),
        eq(client.userId, userId),
      ),
      columns: { id: true },
    });
    return !!foundClient;
  }

  // Asset allocation: owned through beneficiary -> client
  if (entityType === "asset_allocation") {
    // Asset allocations reference beneficiaryId, look up the chain
    // For now, deny access (would need asset_allocation table reference)
    // This is a conservative approach - can be expanded later
    return false;
  }

  // Unknown entity type - deny by default
  return false;
}

/**
 * Gets the clientId for a client-owned entity
 */
async function getClientIdForEntity(
  entityType: AuditEntityType,
  entityId: string,
): Promise<string | null> {
  const db = getDb();

  switch (entityType) {
    case "asset": {
      const found = await db.query.asset.findFirst({
        where: eq(asset.id, entityId),
        columns: { clientId: true },
      });
      return found?.clientId ?? null;
    }
    case "debt": {
      const found = await db.query.debt.findFirst({
        where: eq(debt.id, entityId),
        columns: { clientId: true },
      });
      return found?.clientId ?? null;
    }
    case "beneficiary": {
      const found = await db.query.beneficiary.findFirst({
        where: eq(beneficiary.id, entityId),
        columns: { clientId: true },
      });
      return found?.clientId ?? null;
    }
    case "business": {
      const found = await db.query.business.findFirst({
        where: eq(business.id, entityId),
        columns: { clientId: true },
      });
      return found?.clientId ?? null;
    }
    case "policy": {
      const found = await db.query.policy.findFirst({
        where: eq(policy.id, entityId),
        columns: { clientId: true },
      });
      return found?.clientId ?? null;
    }
    default:
      return null;
  }
}

/**
 * Gets the businessId for a business-owned entity
 */
async function getBusinessIdForEntity(
  entityType: AuditEntityType,
  entityId: string,
): Promise<string | null> {
  const db = getDb();

  switch (entityType) {
    case "key_person": {
      const found = await db.query.keyPerson.findFirst({
        where: eq(keyPerson.id, entityId),
        columns: { businessId: true },
      });
      return found?.businessId ?? null;
    }
    case "shareholder": {
      const found = await db.query.shareholder.findFirst({
        where: eq(shareholder.id, entityId),
        columns: { businessId: true },
      });
      return found?.businessId ?? null;
    }
    case "corporate_insurance_need": {
      const found = await db.query.corporateInsuranceNeed.findFirst({
        where: eq(corporateInsuranceNeed.id, entityId),
        columns: { businessId: true },
      });
      return found?.businessId ?? null;
    }
    default:
      return null;
  }
}

/**
 * Gets all client IDs owned by a user.
 * Used for filtering audit logs to only show entries for owned entities.
 */
export async function getUserClientIds(userId: string): Promise<string[]> {
  const db = getDb();

  const clients = await db.query.client.findMany({
    where: eq(client.userId, userId),
    columns: { id: true },
  });

  return clients.map((c) => c.id);
}
