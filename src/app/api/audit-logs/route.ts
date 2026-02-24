import { getDb } from "@/server/db";
import {
  auditLog,
  auditEntityTypeEnum,
  auditActionEnum,
  assetAllocation,
  client,
  asset,
  debt,
  beneficiary,
  business,
  policy,
  keyPerson,
  shareholder,
  corporateInsuranceNeed,
} from "@/server/db/schemas";
import { createLogger } from "@/server/axiom";
import { and, count, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { validateSession } from "@/lib/api/route-helpers";
import { verifyAuditEntityAccess } from "@/lib/api/client-helpers";

/**
 * Pagination defaults and limits
 */
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * Query parameters schema for audit log filtering
 */
const auditLogQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),

  // Filtering
  entityType: z.enum(auditEntityTypeEnum.enumValues).optional(),
  entityId: z.string().min(1).optional(),
  action: z.enum(auditActionEnum.enumValues).optional(),
  userId: z.string().optional(),

  // Date range
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
});

/**
 * GET /api/audit-logs - Query audit logs with filtering and pagination
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 100)
 * - entityType: Filter by entity type (e.g., "client", "asset")
 * - entityId: Filter by specific entity UUID
 * - action: Filter by action type ("create", "update", "delete", "restore")
 * - userId: Filter by user who made the change
 * - startDate: Filter changes after this date (YYYY-MM-DD)
 * - endDate: Filter changes before this date (YYYY-MM-DD)
 *
 * Authorization:
 * - Users can only see audit logs for entities they own
 * - If entityId is specified, access is verified for that specific entity
 * - Otherwise, results are filtered to only show owned entities
 */
export async function GET(request: Request) {
  const logger = createLogger({ endpoint: "/api/audit-logs", method: "GET" });

  try {
    const sessionResult = await validateSession(logger);
    if ("error" in sessionResult) return sessionResult.error;
    const { session } = sessionResult;

    logger.addContext({ userId: session.user.id });

    // Parse query parameters
    const url = new URL(request.url);
    const queryResult = auditLogQuerySchema.safeParse({
      page: url.searchParams.get("page") ?? DEFAULT_PAGE,
      limit: url.searchParams.get("limit") ?? DEFAULT_LIMIT,
      entityType: url.searchParams.get("entityType") ?? undefined,
      entityId: url.searchParams.get("entityId") ?? undefined,
      action: url.searchParams.get("action") ?? undefined,
      userId: url.searchParams.get("userId") ?? undefined,
      startDate: url.searchParams.get("startDate") ?? undefined,
      endDate: url.searchParams.get("endDate") ?? undefined,
    });

    if (!queryResult.success) {
      await logger.warn("Invalid query parameters", {
        validationErrors: queryResult.error.flatten(),
      });
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: queryResult.error.format(),
        },
        { status: 400 },
      );
    }

    const {
      page,
      limit,
      entityType,
      entityId,
      action,
      userId,
      startDate,
      endDate,
    } = queryResult.data;
    const offset = (page - 1) * limit;

    logger.addContext({
      page,
      limit,
      entityType,
      entityId,
      action,
      userId: userId ?? undefined,
      startDate,
      endDate,
    });

    const db = getDb();

    // =========================================================================
    // AUTHORIZATION
    // =========================================================================
    // If a specific entityId is requested, verify access to that entity.
    // Otherwise, we'll filter results to only show owned entities.

    if (entityId && entityType) {
      const hasAccess = await verifyAuditEntityAccess(
        entityType,
        entityId,
        session.user.id,
      );

      if (!hasAccess) {
        await logger.warn("Access denied to entity audit logs", {
          statusCode: 403,
          entityType,
          entityId,
        });
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // Get all entity IDs the user has access to for filtering
    // This is more efficient than checking each log entry individually
    const ownedEntityIds = await getOwnedEntityIds(db, session.user.id);

    // Build dynamic where clause
    const conditions = [];

    // Authorization filter: only show logs for owned entities
    if (ownedEntityIds.length > 0) {
      conditions.push(inArray(auditLog.entityId, ownedEntityIds));
    } else {
      // User has no owned entities - return empty results
      return NextResponse.json({
        logs: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        filters: {
          entityType,
          entityId,
          action,
          userId,
          startDate,
          endDate,
        },
      });
    }

    if (entityType) {
      conditions.push(eq(auditLog.entityType, entityType));
    }
    if (entityId) {
      conditions.push(eq(auditLog.entityId, entityId));
    }
    if (action) {
      conditions.push(eq(auditLog.action, action));
    }
    if (userId) {
      conditions.push(eq(auditLog.userId, userId));
    }
    if (startDate) {
      conditions.push(gte(auditLog.createdAt, new Date(startDate)));
    }
    if (endDate) {
      // Add one day to include the entire end date
      const endDateTime = new Date(endDate);
      endDateTime.setDate(endDateTime.getDate() + 1);
      conditions.push(lte(auditLog.createdAt, endDateTime));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(auditLog)
      .where(whereClause);

    // Get paginated results
    const logs = await db.query.auditLog.findMany({
      where: whereClause,
      orderBy: [desc(auditLog.createdAt)],
      limit,
      offset,
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const total = totalResult[0]?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    await logger.info("Audit logs fetched successfully", {
      statusCode: 200,
      logCount: logs.length,
      total,
      page,
      totalPages,
    });

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      filters: {
        entityType,
        entityId,
        action,
        userId,
        startDate,
        endDate,
      },
    });
  } catch (error) {
    await logger.error(
      "Error fetching audit logs",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

type DbClient = ReturnType<typeof getDb>;

/**
 * Gets all entity IDs that a user has access to for audit log filtering.
 *
 * This collects IDs from:
 * - Clients owned by the user
 * - Assets, debts, beneficiaries, policies belonging to those clients
 * - Businesses belonging to those clients
 * - Key persons, shareholders, insurance needs belonging to those businesses
 * - The user's own profile ID
 */
async function getOwnedEntityIds(
  db: DbClient,
  userId: string,
): Promise<string[]> {
  const entityIds: string[] = [];

  // Get all client IDs owned by the user
  const clients = await db
    .select({ id: client.id })
    .from(client)
    .where(eq(client.userId, userId));

  const clientIds = clients.map((c) => c.id);
  entityIds.push(...clientIds);

  if (clientIds.length === 0) {
    return entityIds;
  }

  // Get all assets for these clients
  const assets = await db
    .select({ id: asset.id })
    .from(asset)
    .where(inArray(asset.clientId, clientIds));
  entityIds.push(...assets.map((a) => a.id));

  // Get all debts for these clients
  const debts = await db
    .select({ id: debt.id })
    .from(debt)
    .where(inArray(debt.clientId, clientIds));
  entityIds.push(...debts.map((d) => d.id));

  // Get all beneficiaries for these clients
  const beneficiaries = await db
    .select({ id: beneficiary.id })
    .from(beneficiary)
    .where(inArray(beneficiary.clientId, clientIds));
  const beneficiaryIds = beneficiaries.map((b) => b.id);
  entityIds.push(...beneficiaryIds);

  // Get all asset allocations for these beneficiaries
  if (beneficiaryIds.length > 0) {
    const allocations = await db
      .select({ id: assetAllocation.id })
      .from(assetAllocation)
      .where(inArray(assetAllocation.beneficiaryId, beneficiaryIds));
    entityIds.push(...allocations.map((a) => a.id));
  }

  // Get all policies for these clients
  const policies = await db
    .select({ id: policy.id })
    .from(policy)
    .where(inArray(policy.clientId, clientIds));
  entityIds.push(...policies.map((p) => p.id));

  // Get all businesses for these clients
  const businesses = await db
    .select({ id: business.id })
    .from(business)
    .where(inArray(business.clientId, clientIds));

  const businessIds = businesses.map((b) => b.id);
  entityIds.push(...businessIds);

  if (businessIds.length > 0) {
    // Get key persons for these businesses
    const keyPersons = await db
      .select({ id: keyPerson.id })
      .from(keyPerson)
      .where(inArray(keyPerson.businessId, businessIds));
    entityIds.push(...keyPersons.map((k) => k.id));

    // Get shareholders for these businesses
    const shareholders = await db
      .select({ id: shareholder.id })
      .from(shareholder)
      .where(inArray(shareholder.businessId, businessIds));
    entityIds.push(...shareholders.map((s) => s.id));

    // Get corporate insurance needs for these businesses
    const insuranceNeeds = await db
      .select({ id: corporateInsuranceNeed.id })
      .from(corporateInsuranceNeed)
      .where(inArray(corporateInsuranceNeed.businessId, businessIds));
    entityIds.push(...insuranceNeeds.map((i) => i.id));
  }

  return entityIds;
}
