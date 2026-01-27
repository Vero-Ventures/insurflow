import { getSession } from "@/server/better-auth/server";
import { getDb } from "@/server/db";
import { asset, client, debt } from "@/server/db/schema";
import { createLogger } from "@/server/axiom";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * UUID validation regex
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Canadian provinces/territories enum
 */
const PROVINCES = [
  "AB",
  "BC",
  "MB",
  "NB",
  "NL",
  "NS",
  "NT",
  "NU",
  "ON",
  "PE",
  "QC",
  "SK",
  "YT",
] as const;

/**
 * Health rating options
 */
const HEALTH_RATINGS = [
  "preferred_plus",
  "preferred",
  "standard_plus",
  "standard",
  "substandard",
] as const;

/**
 * Validates a date string is a valid date (not just format) and not in the future
 */
function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;

  // Parse the input date components
  const [year, month, day] = dateStr.split("-").map(Number);

  // Use UTC methods to avoid timezone issues
  const isValidDateStructure =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month! - 1 &&
    date.getUTCDate() === day;

  // Check if date is not in the future (compare start of days)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inputDate = new Date(date);
  inputDate.setHours(0, 0, 0, 0);

  return isValidDateStructure && inputDate <= today;
}

/**
 * Decimal string validation - matches PostgreSQL decimal format
 */
const decimalString = (fieldName: string) =>
  z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, `Invalid ${fieldName} format`)
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      },
      { message: `${fieldName} must be a non-negative number` },
    );

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
 */
const updateClientSchema = z
  .object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
      .refine(isValidDate, "Invalid or future date")
      .optional(),
    sex: z.enum(["M", "F"]).optional(),
    province: z.enum(PROVINCES).optional(),
    smoker: z.boolean().optional(),
    healthRating: z.enum(HEALTH_RATINGS).optional(),
    hasSpouse: z.boolean().optional(),
    spouseAge: z.number().int().min(18).max(120).optional(),
    clientIncome: decimalString("income").optional(),
    spouseIncome: decimalString("spouse income").optional(),
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
    status: z.enum(["draft", "active", "archived"]).optional(),
  })
  .strict();

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
    const validationResult = updateClientSchema.safeParse(body);
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
    const now = new Date();

    // Soft delete with ownership and deletion check in WHERE clause
    const [deletedClient] = await db
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

    if (!deletedClient) {
      await logger.info("Client not found for deletion", { statusCode: 404 });
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Cascade soft-delete to child records (assets and debts)
    // Run these in parallel for better performance
    await Promise.all([
      db
        .update(asset)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(asset.clientId, id), isNull(asset.deletedAt))),
      db
        .update(debt)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(debt.clientId, id), isNull(debt.deletedAt))),
    ]);

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
