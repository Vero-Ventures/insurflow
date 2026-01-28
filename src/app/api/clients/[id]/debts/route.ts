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
    return NextResponse.json(
      { error: "Invalid client ID format" },
      { status: 400 },
    );
  }
  return null;
}

/**
 * Validation schema for creating a debt
 */
const createDebtSchema = z
  .object({
    name: z.string().min(1, "Debt name is required").max(255),
    type: z.enum([
      "mortgage",
      "heloc",
      "car_loan",
      "student_loan",
      "personal_loan",
      "credit_card",
      "line_of_credit",
      "business_loan",
      "other",
    ]),
    currentBalance: z
      .string()
      .refine(
        (val) => {
          const num = parseFloat(val);
          return !isNaN(num) && num >= 0;
        },
        { message: "Current balance must be a valid positive number" },
      )
      .transform((val) => parseFloat(val)),
  })
  .strict();

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
    const session = await getSession();

    if (!session?.user) {
      await logger.warn("Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.addContext({ userId: session.user.id, clientId: id });

    // Validate UUID format
    const uuidError = validateUUID(id);
    if (uuidError) {
      await logger.warn("Invalid UUID format");
      return uuidError;
    }

    const db = getDb();

    // Verify client exists and belongs to user
    const foundClient = await db.query.client.findFirst({
      where: and(
        eq(client.id, id),
        eq(client.userId, session.user.id),
        isNull(client.deletedAt),
      ),
    });

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
    const session = await getSession();

    if (!session?.user) {
      await logger.warn("Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.addContext({ userId: session.user.id, clientId: id });

    // Validate UUID format
    const uuidError = validateUUID(id);
    if (uuidError) {
      await logger.warn("Invalid UUID format");
      return uuidError;
    }

    let body;
    try {
      body = await request.json();
    } catch {
      await logger.warn("Invalid JSON body received");
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Validate request body
    const validationResult = createDebtSchema.safeParse(body);
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

    const db = getDb();

    // Verify client exists and belongs to user
    const foundClient = await db.query.client.findFirst({
      where: and(
        eq(client.id, id),
        eq(client.userId, session.user.id),
        isNull(client.deletedAt),
      ),
    });

    if (!foundClient) {
      await logger.info("Client not found for debt creation", {
        statusCode: 404,
      });
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Create new debt
    const [newDebt] = await db
      .insert(debt)
      .values({
        clientId: id,
        name: validationResult.data.name,
        type: validationResult.data.type,
        currentBalance: validationResult.data.currentBalance.toString(),
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
