import { getDb } from "@/server/db";
import { asset, client, debt } from "@/server/db/schemas";
import { createLogger } from "@/server/axiom";
import {
  decimalString,
  HEALTH_RATINGS,
  isValidClientAge,
  isValidDate,
  STATES,
  UUID_REGEX,
} from "@/lib/validation/client";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  validateAdvisorSession,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";

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
 * Validation schema for updating a client (all fields optional)
 * Uses .strict() to reject unknown fields
 *
 * Note: This schema validates that if hasSpouse is set to true,
 * spouseAge must also be provided in the same request. For updates
 * where hasSpouse is not being changed, the existing database state
 * is not re-validated (this is intentional for partial updates).
 */
const updateClientSchema = z
  .object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
      .refine(isValidDate, "Invalid or future date")
      .refine(isValidClientAge, "Client must be between 18 and 120 years old")
      .optional(),
    sex: z.enum(["M", "F"]).optional(),
    state: z.enum(STATES).optional(),
    smoker: z.boolean().optional(),
    healthRating: z.enum(HEALTH_RATINGS).optional(),
    hasSpouse: z.boolean().optional(),
    spouseAge: z.number().int().min(18).max(120).optional(),
    clientIncome: decimalString("income").optional(),
    spouseIncome: decimalString("spouse income").nullable().optional(),
    incomeReplacementPercent: decimalString("replacement percent")
      .refine(
        (val) => {
          const num = parseFloat(val);
          return num >= 0 && num <= 100;
        },
        { message: "Replacement percent must be between 0 and 100" },
      )
      .optional(),
    replacementDurationYears: z.number().int().min(0).max(50).optional(),
    existingLifeInsuranceCoverage: decimalString("coverage amount").optional(),
    retirementAge: z.number().int().min(18).max(120).optional().nullable(),
    youngestChildAge: z.number().int().min(0).max(17).optional().nullable(),
    govSurvivorBenefit: decimalString("government survivor benefit").optional(),
    investmentIncome: decimalString("investment income").optional(),
    otherIncome: decimalString("other income").optional(),
    additionalGoals: z.string().max(2000).nullable().optional(),
    status: z.enum(["draft", "active", "archived"]).optional(),
  })
  .strict()
  .refine(
    (data) => {
      // If hasSpouse is being explicitly set to true, spouseAge must be provided
      if (data.hasSpouse === true && data.spouseAge === undefined) {
        return false;
      }
      return true;
    },
    {
      message: "Spouse age is required when setting hasSpouse to true",
      path: ["spouseAge"],
    },
  );

/**
 * GET /api/clients/[id] - Get a single client by ID
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const logger = createLogger({
    endpoint: `/api/clients/${id}`,
    method: "GET",
  });

  try {
    const sessionResult = await validateAdvisorSession(logger);
    if ("error" in sessionResult) return sessionResult.error;
    const { session } = sessionResult;

    logger.addContext({ userId: session.user.id, clientId: id });

    // Validate UUID format
    const uuidError = validateUUID(id);
    if (uuidError) {
      await logger.warn("Invalid UUID format");
      return uuidError;
    }

    const db = getDb();

    // Fetch client with ownership verification
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

    await logger.info("Client fetched successfully", { statusCode: 200 });
    return NextResponse.json({ client: foundClient });
  } catch (error) {
    await logger.error(
      "Error fetching client",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/clients/[id] - Update a client
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const logger = createLogger({
    endpoint: `/api/clients/${id}`,
    method: "PATCH",
  });

  try {
    const sessionResult = await validateAdvisorSession(logger);
    if ("error" in sessionResult) return sessionResult.error;
    const { session } = sessionResult;

    logger.addContext({ userId: session.user.id, clientId: id });

    // Validate UUID format
    const uuidError = validateUUID(id);
    if (uuidError) {
      await logger.warn("Invalid UUID format");
      return uuidError;
    }

    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) return bodyResult.error;

    // Validate request body
    const validationResult = updateClientSchema.safeParse(bodyResult.body);
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

    // Update client with ownership and deletion check in WHERE clause
    const [updatedClient] = await db
      .update(client)
      .set({
        ...validationResult.data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(client.id, id),
          eq(client.userId, session.user.id),
          isNull(client.deletedAt),
        ),
      )
      .returning();

    if (!updatedClient) {
      await logger.info("Client not found for update", { statusCode: 404 });
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    await logger.info("Client updated successfully", { statusCode: 200 });
    return NextResponse.json({ client: updatedClient });
  } catch (error) {
    await logger.error(
      "Error updating client",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/clients/[id] - Soft delete a client and cascade to child records
 *
 * Uses a database transaction to ensure atomicity - either all records
 * (client, assets, debts) are soft-deleted, or none are.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const logger = createLogger({
    endpoint: `/api/clients/${id}`,
    method: "DELETE",
  });

  try {
    const sessionResult = await validateAdvisorSession(logger);
    if ("error" in sessionResult) return sessionResult.error;
    const { session } = sessionResult;

    logger.addContext({ userId: session.user.id, clientId: id });

    // Validate UUID format
    const uuidError = validateUUID(id);
    if (uuidError) {
      await logger.warn("Invalid UUID format");
      return uuidError;
    }

    const db = getDb();
    const now = new Date();

    // Use transaction for atomic cascade soft-delete
    const deletedClient = await db.transaction(async (tx) => {
      // Soft delete client with ownership and deletion check in WHERE clause
      const [deleted] = await tx
        .update(client)
        .set({
          deletedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(client.id, id),
            eq(client.userId, session.user.id),
            isNull(client.deletedAt),
          ),
        )
        .returning();

      if (!deleted) {
        return null;
      }

      // Cascade soft-delete to child records (assets and debts)
      // Run these in parallel for better performance
      await Promise.all([
        tx
          .update(asset)
          .set({ deletedAt: now, updatedAt: now })
          .where(and(eq(asset.clientId, id), isNull(asset.deletedAt))),
        tx
          .update(debt)
          .set({ deletedAt: now, updatedAt: now })
          .where(and(eq(debt.clientId, id), isNull(debt.deletedAt))),
      ]);

      return deleted;
    });

    if (!deletedClient) {
      await logger.info("Client not found for deletion", { statusCode: 404 });
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    await logger.info("Client and child records deleted successfully", {
      statusCode: 200,
    });

    return NextResponse.json(
      { message: "Client deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    await logger.error(
      "Error deleting client",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
