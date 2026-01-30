import { getDb } from "@/server/db";
import { debt } from "@/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createDebtSchema } from "@/lib/validation/debt";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";

/**
 * GET /api/clients/[id]/debts - Get all debts for a client
 */
export const GET = withApiHandler(
  {
    endpoint: "/api/clients/[id]/debts",
    method: "GET",
    requireClient: true,
  },
  async (_request, { logger, clientId }) => {
    const db = getDb();

    // Fetch all non-deleted debts for the client
    const debts = await db.query.debt.findMany({
      where: and(eq(debt.clientId, clientId!), isNull(debt.deletedAt)),
    });

    await logger.info("Debts fetched successfully", {
      statusCode: 200,
      debtCount: debts.length,
    });

    return { data: { items: debts } };
  },
);

/**
 * POST /api/clients/[id]/debts - Create a new debt for a client
 */
export const POST = withApiHandler(
  {
    endpoint: "/api/clients/[id]/debts",
    method: "POST",
    requireClient: true,
  },
  async (request, { logger, clientId }) => {
    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) return bodyResult.error;

    // Validate request body
    const validationResult = createDebtSchema.safeParse(bodyResult.body);
    if (!validationResult.success) {
      return handleValidationError(logger, validationResult.error);
    }

    const db = getDb();

    // Create new debt
    const [newDebt] = await db
      .insert(debt)
      .values({
        clientId: clientId!,
        name: validationResult.data.name,
        type: validationResult.data.type,
        currentBalance: validationResult.data.currentBalance,
      })
      .returning();

    if (!newDebt) {
      await logger.error("Failed to create debt - no result returned");
      return NextResponse.json(
        { error: "Failed to create debt" },
        { status: 500 },
      );
    }

    await logger.info("Debt created successfully", {
      statusCode: 201,
      debtId: newDebt.id,
    });

    return { data: { debt: newDebt }, status: 201 };
  },
);
