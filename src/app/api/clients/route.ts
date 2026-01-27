import { getSession } from "@/server/better-auth/server";
import { getDb } from "@/server/db";
import { client } from "@/server/db/schema";
import { createLogger } from "@/server/axiom";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

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
  // Ensure the parsed date matches the input (catches invalid dates like 2024-02-31)
  const [year, month, day] = dateStr.split("-").map(Number);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month! - 1 &&
    date.getDate() === day &&
    date <= new Date()
  );
}

/**
 * Decimal string validation - matches PostgreSQL decimal format
 * Allows positive numbers with optional 2 decimal places
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
 * Validation schema for creating a client
 * Uses .strict() to reject unknown fields
 */
const createClientSchema = z
  .object({
    firstName: z.string().min(1, "First name is required").max(100),
    lastName: z.string().min(1, "Last name is required").max(100),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .refine(isValidDate, "Invalid or future date"),
    sex: z.enum(["M", "F"]),
    province: z.enum(PROVINCES),
    smoker: z.boolean().default(false),
    healthRating: z.enum(HEALTH_RATINGS).default("standard"),
    hasSpouse: z.boolean().default(false),
    spouseAge: z.number().int().min(18).max(120).optional(),
    clientIncome: decimalString("income").default("0"),
    spouseIncome: decimalString("spouse income").optional(),
    incomeReplacementPercent: decimalString("replacement percent")
      .default("70")
      .refine(
        (val) => {
          const num = parseFloat(val);
          return num >= 0 && num <= 100;
        },
        { message: "Replacement percent must be between 0 and 100" },
      ),
    replacementDurationYears: z.number().int().min(0).max(50).default(10),
    existingLifeInsuranceCoverage:
      decimalString("coverage amount").default("0"),
    status: z.enum(["draft", "active", "archived"]).default("draft"),
  })
  .strict()
  .refine(
    (data) => {
      // If hasSpouse is true, spouseAge should be provided
      if (data.hasSpouse && data.spouseAge === undefined) {
        return false;
      }
      return true;
    },
    {
      message: "Spouse age is required when hasSpouse is true",
      path: ["spouseAge"],
    },
  );

/**
 * GET /api/clients - List all clients for the authenticated user
 */
export async function GET() {
  const logger = createLogger({ endpoint: "/api/clients", method: "GET" });

  try {
    const session = await getSession();

    if (!session?.user) {
      await logger.warn("Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.addContext({ userId: session.user.id });

    const db = getDb();

    // Fetch all non-deleted clients for the current user
    const clients = await db.query.client.findMany({
      where: and(eq(client.userId, session.user.id), isNull(client.deletedAt)),
      orderBy: (client, { desc }) => [desc(client.createdAt)],
    });

    await logger.info("Clients fetched successfully", {
      statusCode: 200,
      clientCount: clients.length,
    });

    return NextResponse.json({ clients });
  } catch (error) {
    await logger.error(
      "Error fetching clients",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/clients - Create a new client
 */
export async function POST(request: Request) {
  const logger = createLogger({ endpoint: "/api/clients", method: "POST" });

  try {
    const session = await getSession();

    if (!session?.user) {
      await logger.warn("Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.addContext({ userId: session.user.id });

    let body;
    try {
      body = await request.json();
    } catch {
      await logger.warn("Invalid JSON body received");
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Validate request body
    const validationResult = createClientSchema.safeParse(body);
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

    const data = validationResult.data;
    const db = getDb();

    // Create client with ownership
    const [newClient] = await db
      .insert(client)
      .values({
        userId: session.user.id,
        ...data,
      })
      .returning();

    await logger.info("Client created successfully", {
      statusCode: 201,
      clientId: newClient?.id,
    });

    return NextResponse.json({ client: newClient }, { status: 201 });
  } catch (error) {
    await logger.error(
      "Error creating client",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
