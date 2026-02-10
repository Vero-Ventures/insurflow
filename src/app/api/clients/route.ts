import { getDb } from "@/server/db";
import { client } from "@/server/db/schema";
import { createLogger } from "@/server/axiom";
import {
  decimalString,
  HEALTH_RATINGS,
  isValidClientAge,
  isValidDate,
  STATES,
} from "@/lib/validation/client";
import { and, count, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  validateSession,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";

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
      .refine(isValidDate, "Invalid or future date")
      .refine(isValidClientAge, "Client must be between 18 and 120 years old"),
    sex: z.enum(["M", "F"]),
    state: z.enum(STATES),
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
    retirementAge: z.number().int().min(18).max(120).optional(),
    youngestChildAge: z.number().int().min(0).max(17).optional(),
    govSurvivorBenefit: decimalString("government survivor benefit").default(
      "0",
    ),
    investmentIncome: decimalString("investment income").default("0"),
    otherIncome: decimalString("other income").default("0"),
    additionalGoals: z.string().max(2000).optional(),
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
 * Pagination defaults and limits
 */
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Query parameters schema for pagination
 */
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

/**
 * GET /api/clients - List all clients for the authenticated user
 * Supports pagination with ?page=1&limit=20 query parameters
 */
export async function GET(request: Request) {
  const logger = createLogger({ endpoint: "/api/clients", method: "GET" });

  try {
    const sessionResult = await validateSession(logger);
    if ("error" in sessionResult) return sessionResult.error;
    const { session } = sessionResult;

    logger.addContext({ userId: session.user.id });

    // Parse pagination parameters from URL
    const url = new URL(request.url);
    const paginationResult = paginationSchema.safeParse({
      page: url.searchParams.get("page") ?? DEFAULT_PAGE,
      limit: url.searchParams.get("limit") ?? DEFAULT_LIMIT,
    });

    if (!paginationResult.success) {
      await logger.warn("Invalid pagination parameters", {
        validationErrors: paginationResult.error.flatten(),
      });
      return NextResponse.json(
        {
          error: "Invalid pagination parameters",
          details: paginationResult.error.format(),
        },
        { status: 400 },
      );
    }

    const { page, limit } = paginationResult.data;
    const offset = (page - 1) * limit;

    logger.addContext({ page, limit, offset });

    const db = getDb();
    const whereClause = and(
      eq(client.userId, session.user.id),
      isNull(client.deletedAt),
    );

    // Execute queries sequentially to avoid concurrent queries on single connection
    const totalResult = await db
      .select({ count: count() })
      .from(client)
      .where(whereClause);

    const clients = await db.query.client.findMany({
      where: whereClause,
      orderBy: (client, { desc }) => [desc(client.createdAt)],
      limit,
      offset,
    });

    const total = totalResult[0]?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    await logger.info("Clients fetched successfully", {
      statusCode: 200,
      clientCount: clients.length,
      total,
      page,
      totalPages,
    });

    return NextResponse.json({
      clients,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
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
    const sessionResult = await validateSession(logger);
    if ("error" in sessionResult) return sessionResult.error;
    const { session } = sessionResult;

    logger.addContext({ userId: session.user.id });

    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) return bodyResult.error;

    // Validate request body
    const validationResult = createClientSchema.safeParse(bodyResult.body);
    if (!validationResult.success) {
      return handleValidationError(logger, validationResult.error);
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
