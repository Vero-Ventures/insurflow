import { getDb } from "@/server/db";
import { debt } from "@/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { updateDebtSchema } from "@/lib/validation/debt";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";

/**
 * PATCH /api/clients/[id]/debts/[debtId] - Update a debt
 */
export const PATCH = withApiHandler(
  {
    endpoint: "/api/clients/[id]/debts/[debtId]",
    method: "PATCH",
    requireClient: true,
    resourceIdParams: ["debtId"],
  },
  async (request, { logger, clientId, resourceIds }) => {
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

    // Update debt with ownership and deletion checks
    const updateData: Record<string, unknown> = {
      ...validationResult.data,
      updatedAt: new Date(),
    };

    const [updatedDebt] = await db
      .update(debt)
      .set(updateData)
      .where(
        and(
          eq(debt.id, debtId),
          eq(debt.clientId, clientId!),
          isNull(debt.deletedAt),
        ),
      )
      .returning();

    if (!updatedDebt) {
      await logger.info("Debt not found for update", { statusCode: 404 });
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }

    await logger.info("Debt updated successfully", { statusCode: 200 });
    return { data: { debt: updatedDebt } };
  },
);

/**
 * DELETE /api/clients/[id]/debts/[debtId] - Soft delete a debt
 */
export const DELETE = withApiHandler(
  {
    endpoint: "/api/clients/[id]/debts/[debtId]",
    method: "DELETE",
    requireClient: true,
    resourceIdParams: ["debtId"],
  },
  async (_request, { logger, clientId, resourceIds }) => {
    const debtId = resourceIds?.debtId;
    if (!debtId) {
      return NextResponse.json(
        { error: "Debt ID is required" },
        { status: 400 },
      );
    }

    const db = getDb();
    const now = new Date();

    // Soft delete debt with ownership and deletion check
    const [deletedDebt] = await db
      .update(debt)
      .set({
        deletedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(debt.id, debtId),
          eq(debt.clientId, clientId!),
          isNull(debt.deletedAt),
        ),
      )
      .returning();

    if (!deletedDebt) {
      await logger.info("Debt not found for deletion", { statusCode: 404 });
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }

    await logger.info("Debt deleted successfully", { statusCode: 200 });
    return { data: { message: "Debt deleted successfully" } };
  },
);
