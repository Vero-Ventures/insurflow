import { getDb } from "@/server/db";
import { debt } from "@/server/db/schema";
import { createLogger } from "@/server/axiom";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { updateDebtSchema } from "@/lib/validation/debt";
import { validateUUID, verifyClientOwnership } from "@/lib/api/client-helpers";
import {
  validateSession,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";

/**
 * PATCH /api/clients/[clientId]/debts/[debtId] - Update a debt
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; debtId: string }> },
) {
  const { id: clientId, debtId } = await params;
  const logger = createLogger({
    endpoint: `/api/clients/${clientId}/debts/${debtId}`,
    method: "PATCH",
  });

  try {
    const sessionResult = await validateSession(logger);
    if ("error" in sessionResult) return sessionResult.error;
    const { session } = sessionResult;

    logger.addContext({
      userId: session.user.id,
      clientId,
      debtId,
    });

    // Validate UUID formats
    const clientError = validateUUID(clientId, "client ID");
    if (clientError) {
      await logger.warn("Invalid client ID format");
      return clientError;
    }

    const debtError = validateUUID(debtId, "debt ID");
    if (debtError) {
      await logger.warn("Invalid debt ID format");
      return debtError;
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

    // Verify client exists and belongs to user
    const foundClient = await verifyClientOwnership(clientId, session.user.id);

    if (!foundClient) {
      await logger.info("Client not found", { statusCode: 404 });
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Update debt with ownership and deletion checks
    const updateData: Record<string, unknown> = {
      ...validationResult.data,
      updatedAt: new Date(),
    };

    // Convert number back to string for decimal fields
    if (
      updateData.currentBalance !== undefined &&
      updateData.currentBalance !== null
    ) {
      updateData.currentBalance = String(updateData.currentBalance);
    }

    const [updatedDebt] = await db
      .update(debt)
      .set(updateData)
      .where(
        and(
          eq(debt.id, debtId),
          eq(debt.clientId, clientId),
          isNull(debt.deletedAt),
        ),
      )
      .returning();

    if (!updatedDebt) {
      await logger.info("Debt not found for update", { statusCode: 404 });
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }

    await logger.info("Debt updated successfully", { statusCode: 200 });
    return NextResponse.json({ debt: updatedDebt });
  } catch (error) {
    await logger.error(
      "Error updating debt",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/clients/[clientId]/debts/[debtId] - Soft delete a debt
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; debtId: string }> },
) {
  const { id: clientId, debtId } = await params;
  const logger = createLogger({
    endpoint: `/api/clients/${clientId}/debts/${debtId}`,
    method: "DELETE",
  });

  try {
    const sessionResult = await validateSession(logger);
    if ("error" in sessionResult) return sessionResult.error;
    const { session } = sessionResult;

    logger.addContext({
      userId: session.user.id,
      clientId,
      debtId,
    });

    // Validate UUID formats
    const clientError = validateUUID(clientId);
    if (clientError) {
      await logger.warn("Invalid client ID format");
      return clientError;
    }

    const debtError = validateUUID(debtId);
    if (debtError) {
      await logger.warn("Invalid debt ID format");
      return debtError;
    }

    // Verify client exists and belongs to user
    const foundClient = await verifyClientOwnership(clientId, session.user.id);

    if (!foundClient) {
      await logger.info("Client not found", { statusCode: 404 });
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
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
          eq(debt.clientId, clientId),
          isNull(debt.deletedAt),
        ),
      )
      .returning();

    if (!deletedDebt) {
      await logger.info("Debt not found for deletion", { statusCode: 404 });
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }

    await logger.info("Debt deleted successfully", { statusCode: 200 });
    return NextResponse.json(
      { message: "Debt deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    await logger.error(
      "Error deleting debt",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
