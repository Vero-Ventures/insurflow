import { getDb } from "@/server/db";
import { auditLog, auditEntityTypeEnum } from "@/server/db/schemas";
import { createLogger } from "@/server/axiom";
import { and, count, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { validateSession } from "@/lib/api/route-helpers";
import { verifyAuditEntityAccess } from "@/lib/api/client-helpers";

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
  entityId: z.string().uuid(),
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
export async function GET(
  request: Request,
  { params }: { params: Promise<{ entityType: string; entityId: string }> },
) {
  const resolvedParams = await params;
  const logger = createLogger({
    endpoint: `/api/audit-logs/entity/${resolvedParams.entityType}/${resolvedParams.entityId}`,
    method: "GET",
  });

  try {
    const sessionResult = await validateSession(logger);
    if ("error" in sessionResult) return sessionResult.error;
    const { session } = sessionResult;

    logger.addContext({ userId: session.user.id });

    // Validate path parameters
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

    // Authorization: verify user has access to this entity
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

    // Parse pagination parameters
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
    const offset = (page - 1) * limit;

    const db = getDb();
    const whereClause = and(
      eq(auditLog.entityType, entityType),
      eq(auditLog.entityId, entityId),
    );

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(auditLog)
      .where(whereClause);

    // Get paginated audit history
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
    const totalPages = Math.ceil(total / limit);

    await logger.info("Entity audit history fetched successfully", {
      statusCode: 200,
      entryCount: history.length,
      total,
      page,
      totalPages,
    });

    return NextResponse.json({
      entityType,
      entityId,
      history,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    await logger.error(
      "Error fetching entity audit history",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
