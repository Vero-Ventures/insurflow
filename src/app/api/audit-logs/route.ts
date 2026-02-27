import { getDb } from "@/server/db";
import {
  auditLog,
  auditEntityTypeEnum,
  auditActionEnum,
} from "@/server/db/schemas";
import { and, count, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/route-helpers";
import { verifyAuditEntityAccess } from "@/lib/api/client-helpers";
import {
  buildPaginationResponse,
  calculateOffset,
  getOwnedEntityIdsForAudit,
} from "@/lib/api/audit-helpers";

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
export const GET = withApiHandler(
  {
    endpoint: "/api/audit-logs",
    method: "GET",
  },
  async (request, { logger, session }) => {
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
    const offset = calculateOffset(page, limit);

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
    const ownedEntityIds = await getOwnedEntityIdsForAudit(db, session.user.id);

    // Build dynamic where clause
    const conditions = [];

    // Authorization filter: only show logs for owned entities
    if (ownedEntityIds.length > 0) {
      conditions.push(inArray(auditLog.entityId, ownedEntityIds));
    } else {
      // User has no owned entities - return empty results
      const response = buildPaginationResponse([], { page, limit }, 0);
      return {
        data: {
          logs: response.data,
          pagination: response.pagination,
          filters: {
            entityType,
            entityId,
            action,
            userId,
            startDate,
            endDate,
          },
        },
      };
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
    const response = buildPaginationResponse(logs, { page, limit }, total);

    await logger.info("Audit logs fetched successfully", {
      statusCode: 200,
      logCount: logs.length,
      total,
      page,
      totalPages: response.pagination.totalPages,
    });

    return {
      data: {
        logs: response.data,
        pagination: response.pagination,
        filters: {
          entityType,
          entityId,
          action,
          userId,
          startDate,
          endDate,
        },
      },
    };
  },
);
