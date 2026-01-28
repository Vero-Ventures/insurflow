import { getSession } from "@/server/better-auth/server";
import { getDb } from "@/server/db";
import { client, debt } from "@/server/db/schema";
import { createLogger } from "@/server/axiom";
import { UUID_REGEX } from "@/lib/validation/client";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Validates UUID format and returns 400 response if invalid
 */
function validateUUID(id: string): NextResponse | null {
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  }
  return null;
}

/**
 * Validation schema for updating a debt
 */
const updateDebtSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    type: z
      .enum([
        "mortgage",
        "heloc",
        "car_loan",
        "student_loan",
        "personal_loan",
        "credit_card",
        "line_of_credit",
        "business_loan",
        "other",
      ])
      .optional(),
    currentBalance: z
      .string()
      .refine(
        (val) => {
          const num = parseFloat(val);
          return !isNaN(num) && num >= 0;
        },
        { message: "Current balance must be a valid positive number" },
      )
      .transform((val) => parseFloat(val))
      .optional(),
  })
  .strict();

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
    const session = await getSession();

    if (!session?.user) {
      await logger.warn("Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    let body;
    try {
      body = await request.json();
    } catch {
      await logger.warn("Invalid JSON body received");
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Validate request body
    const validationResult = updateDebtSchema.safeParse(body);
    if (!validationResult.success) {
      await logger.warn("Validation failed", {
        validationErrors: validationResult.error.flatten(),
      });
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.format(),
        },
        { status: 400 },
      );
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
    const foundClient = await db.query.client.findFirst({
      where: and(
        eq(client.id, clientId),
        eq(client.userId, session.user.id),
        isNull(client.deletedAt),
      ),
    });

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
    const session = await getSession();

    if (!session?.user) {
      await logger.warn("Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const db = getDb();

    // Verify client exists and belongs to user
    const foundClient = await db.query.client.findFirst({
      where: and(
        eq(client.id, clientId),
        eq(client.userId, session.user.id),
        isNull(client.deletedAt),
      ),
    });

    if (!foundClient) {
      await logger.info("Client not found", { statusCode: 404 });
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

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
