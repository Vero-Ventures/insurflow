import { getDb } from "@/server/db";
import { client, debt } from "@/server/db/schema";
import { and, eq, exists, isNull, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";
import { updateDebtSchema } from "@/lib/validation/debt";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";

/**
 * Creates the ownership verification EXISTS subquery.
 * Ensures client belongs to user and is not deleted.
 */
function createOwnershipCheck(
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
 * PATCH /api/clients/[id]/debts/[debtId] - Update a debt
 *
 * Security: Uses EXISTS subquery to atomically verify client ownership
 * in the same UPDATE statement, preventing TOCTOU race conditions.
 */
export const PATCH = withApiHandler(
  {
    endpoint: "/api/clients/[id]/debts/[debtId]",
    method: "PATCH",
    resourceIdParams: ["debtId"],
  },
  async (request, { logger, session, clientId, resourceIds }) => {
    const debtId = resourceIds?.debtId;
    if (!debtId) {
      return NextResponse.json(
        { error: "Debt ID is required" },
        { status: 400 },
      );
    }

    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) return bodyResult.error;

    // Validate request body
    const validationResult = updateDebtSchema.safeParse(bodyResult.body);
    if (!validationResult.success) {
      return handleValidationError(logger, validationResult.error);
    }

    // Check if no fields were provided
    if (Object.keys(validationResult.data).length === 0) {
      await logger.warn("No fields provided for update");
      return NextResponse.json(
        { error: "No fields provided for update" },
        { status: 400 },
      );
    }

    const db = getDb();

    // Base WHERE conditions for debt queries (DRY)
    const baseWhere: SQL = and(
      eq(debt.id, debtId),
      eq(debt.clientId, clientId!),
      isNull(debt.deletedAt),
    )!;

    // First check if debt exists (to distinguish "not found" from "ownership failed")
    const existingDebt = await db.query.debt.findFirst({
      where: baseWhere,
    });

    if (!existingDebt) {
      await logger.info("Debt not found for update", { statusCode: 404 });
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }

    // Update debt with atomic ownership verification via EXISTS subquery
    // This prevents TOCTOU race condition by checking ownership in the same statement
    const updateData: Record<string, unknown> = {
      ...validationResult.data,
      updatedAt: new Date(),
    };

    const [updatedDebt] = await db
      .update(debt)
      .set(updateData)
      .where(
        and(baseWhere, createOwnershipCheck(db, clientId!, session.user.id)),
      )
      .returning();

    if (!updatedDebt) {
      // Debt exists but ownership check failed - client was reassigned between check and update
      await logger.warn("Client ownership verification failed during update", {
        statusCode: 403,
      });
      return NextResponse.json(
        { error: "Client not found or access denied" },
        { status: 403 },
      );
    }

    await logger.info("Debt updated successfully", { statusCode: 200 });
    return { data: { debt: updatedDebt } };
  },
);

/**
 * DELETE /api/clients/[id]/debts/[debtId] - Soft delete a debt
 *
 * Security: Uses EXISTS subquery to atomically verify client ownership
 * in the same UPDATE statement, preventing TOCTOU race conditions.
 */
export const DELETE = withApiHandler(
  {
    endpoint: "/api/clients/[id]/debts/[debtId]",
    method: "DELETE",
    resourceIdParams: ["debtId"],
  },
  async (_request, { logger, session, clientId, resourceIds }) => {
    const debtId = resourceIds?.debtId;
    if (!debtId) {
      return NextResponse.json(
        { error: "Debt ID is required" },
        { status: 400 },
      );
    }

    const db = getDb();

    // Base WHERE conditions for debt queries (DRY)
    const baseWhere: SQL = and(
      eq(debt.id, debtId),
      eq(debt.clientId, clientId!),
      isNull(debt.deletedAt),
    )!;

    // First check if debt exists (to distinguish "not found" from "ownership failed")
    const existingDebt = await db.query.debt.findFirst({
      where: baseWhere,
    });

    if (!existingDebt) {
      await logger.info("Debt not found for deletion", { statusCode: 404 });
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }

    const now = new Date();

    // Soft delete debt with atomic ownership verification via EXISTS subquery
    // This prevents TOCTOU race condition by checking ownership in the same statement
    const [deletedDebt] = await db
      .update(debt)
      .set({
        deletedAt: now,
        updatedAt: now,
      })
      .where(
        and(baseWhere, createOwnershipCheck(db, clientId!, session.user.id)),
      )
      .returning();

    if (!deletedDebt) {
      // Debt exists but ownership check failed - client was reassigned between check and delete
      await logger.warn("Client ownership verification failed during delete", {
        statusCode: 403,
      });
      return NextResponse.json(
        { error: "Client not found or access denied" },
        { status: 403 },
      );
    }

    await logger.info("Debt deleted successfully", { statusCode: 200 });
    return { data: { message: "Debt deleted successfully" } };
  },
);
