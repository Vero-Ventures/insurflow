import { getDb } from "@/server/db";
import { debt } from "@/server/db/schema";
import { createLogger } from "@/server/axiom";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createDebtSchema } from "@/lib/validation/debt";
import { validateUUID, verifyClientOwnership } from "@/lib/api/client-helpers";
import {
  validateSession,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";

/**
 * GET /api/clients/[id]/debts - Get all debts for a client
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const logger = createLogger({
    endpoint: `/api/clients/${id}/debts`,
    method: "GET",
  });

  try {
    const sessionResult = await validateSession(logger);
    if ("error" in sessionResult) return sessionResult.error;
    const { session } = sessionResult;

    logger.addContext({ userId: session.user.id, clientId: id });

    // Validate UUID format
    const uuidError = validateUUID(id, "client ID");
    if (uuidError) {
      await logger.warn("Invalid UUID format");
      return uuidError;
    }

    const db = getDb();

    // Verify client exists and belongs to user
    const foundClient = await verifyClientOwnership(id, session.user.id);

    if (!foundClient) {
      await logger.info("Client not found", { statusCode: 404 });
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Fetch all non-deleted debts for the client
    const debts = await db.query.debt.findMany({
      where: and(eq(debt.clientId, id), isNull(debt.deletedAt)),
    });

    await logger.info("Debts fetched successfully", {
      statusCode: 200,
      debtCount: debts.length,
    });

    return NextResponse.json({ debts });
  } catch (error) {
    await logger.error(
      "Error fetching debts",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/clients/[id]/debts - Create a new debt for a client
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const logger = createLogger({
    endpoint: `/api/clients/${id}/debts`,
    method: "POST",
  });

  try {
    const sessionResult = await validateSession(logger);
    if ("error" in sessionResult) return sessionResult.error;
    const { session } = sessionResult;

    logger.addContext({ userId: session.user.id, clientId: id });

    // Validate UUID format
    const uuidError = validateUUID(id, "client ID");
    if (uuidError) {
      await logger.warn("Invalid UUID format");
      return uuidError;
    }

    // Verify client exists and belongs to user
    const foundClient = await verifyClientOwnership(id, session.user.id);

    if (!foundClient) {
      await logger.info("Client not found", { statusCode: 404 });
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

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
        clientId: id,
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

    return NextResponse.json({ debt: newDebt }, { status: 201 });
  } catch (error) {
    await logger.error(
      "Error creating debt",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
