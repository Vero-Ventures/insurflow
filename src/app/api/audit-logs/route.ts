import { getDb } from "@/server/db";
import {
  auditLog,
  auditEntityTypeEnum,
  auditActionEnum,
} from "@/server/db/schemas";
import { createLogger } from "@/server/axiom";
import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { validateSession } from "@/lib/api/route-helpers";

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
  entityId: z.string().uuid().optional(),
  action: z.enum(auditActionEnum.enumValues).optional(),
  userId: z.string().uuid().optional(),

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

    // Build dynamic where clause
    const conditions = [];

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
