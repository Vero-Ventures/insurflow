import { getDb } from "@/server/db";
import { auditLog, auditEntityTypeEnum } from "@/server/db/schemas";
import { and, count, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/route-helpers";
import { verifyAuditEntityAccess } from "@/lib/api/client-helpers";
import {
  buildPaginationResponse,
  calculateOffset,
} from "@/lib/api/audit-helpers";

/**
 * Pagination defaults
 */
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Path parameter validation
 */
const pathParamsSchema = z.object({
  entityType: z.enum(auditEntityTypeEnum.enumValues),
  entityId: z.string().min(1), // Accept both UUID and text IDs
});

/**
 * Query parameters for pagination
 */
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

/**
 * GET /api/audit-logs/entity/[entityType]/[entityId]
 *
 * Get the complete change history for a specific entity.
 * Returns all audit log entries in reverse chronological order.
 *
 * Path Parameters:
 * - entityType: The type of entity (e.g., "client", "asset", "debt")
 * - entityId: The UUID of the entity
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 */
export const GET = withApiHandler(
  {
    endpoint: "/api/audit-logs/entity/[entityType]/[entityId]",
    method: "GET",
  },
  async (request, { logger, session, params }) => {
    const resolvedParams = {
      entityType: params.entityType ?? "",
      entityId: params.entityId ?? "",
    };

    const pathResult = pathParamsSchema.safeParse(resolvedParams);
    if (!pathResult.success) {
      await logger.warn("Invalid path parameters", {
        validationErrors: pathResult.error.flatten(),
      });
      return NextResponse.json(
        {
          error: "Invalid entity type or ID",
          details: pathResult.error.format(),
        },
        { status: 400 },
      );
    }

    const { entityType, entityId } = pathResult.data;
    logger.addContext({ entityType, entityId });

    const hasAccess = await verifyAuditEntityAccess(
      entityType,
      entityId,
      session.user.id,
    );

    if (!hasAccess) {
      await logger.warn("Access denied to entity audit history", {
        statusCode: 403,
      });
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const url = new URL(request.url);
    const paginationResult = paginationSchema.safeParse({
      page: url.searchParams.get("page") ?? DEFAULT_PAGE,
      limit: url.searchParams.get("limit") ?? DEFAULT_LIMIT,
    });

    if (!paginationResult.success) {
      await logger.warn("Invalid pagination parameters", {
        validationErrors: paginationResult.error.flatten(),
      });
      return NextResponse.json(
        {
          error: "Invalid pagination parameters",
          details: paginationResult.error.format(),
        },
        { status: 400 },
      );
    }

    const { page, limit } = paginationResult.data;
    const offset = calculateOffset(page, limit);

    const db = getDb();
    const whereClause = and(
      eq(auditLog.entityType, entityType),
      eq(auditLog.entityId, entityId),
    );

    const totalResult = await db
      .select({ count: count() })
      .from(auditLog)
      .where(whereClause);

    const history = await db.query.auditLog.findMany({
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
    const response = buildPaginationResponse(history, { page, limit }, total);

    await logger.info("Entity audit history fetched successfully", {
      statusCode: 200,
      entryCount: history.length,
      total,
      page,
      totalPages: response.pagination.totalPages,
    });

    return {
      data: {
        entityType,
        entityId,
        history: response.data,
        pagination: response.pagination,
      },
    };
  },
);
