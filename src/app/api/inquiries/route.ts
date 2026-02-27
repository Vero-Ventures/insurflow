import { getDb } from "@/server/db";
import { inquiry } from "@/server/db/schemas";
import { createLogger } from "@/server/axiom";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, isNull, desc, and, or, count } from "drizzle-orm";
import { getClientIp } from "@/lib/api/shared-utils";
import {
  createInquirySchema,
  INQUIRY_STATUSES,
} from "@/lib/validation/shared-schemas";

/**
 * POST /api/inquiries
 * Create a new inquiry when consumer shares their estimate with an advisor.
 * Public endpoint - no authentication required.
 */
export async function POST(request: Request) {
  const logger = createLogger({
    endpoint: "/api/inquiries",
    method: "POST",
  });

  try {
    const body = await request.json();
    const validationResult = createInquirySchema.safeParse(body);

    if (!validationResult.success) {
      await logger.warn("Invalid inquiry submission", {
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

    const consumerIp = await getClientIp(request);
    const userAgent = request.headers.get("user-agent");

    const [newInquiry] = await db
      .insert(inquiry)
      .values({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || null,
        referralSource: data.referralSource || null,
        householdStatus: data.householdStatus || null,
        annualHouseholdIncome: data.annualHouseholdIncome || null,
        totalDebts: data.totalDebts || null,
        currentCoverage: data.currentCoverage || null,
        primaryGoal: data.primaryGoal || null,
        estimatedCoverageNeed: data.estimatedCoverageNeed || null,
        estimatedPremium: data.estimatedPremium || null,
        scenarioId: data.scenarioId || null,
        status: "completed",
        consumerIpAddress: consumerIp,
        consumerUserAgent: userAgent,
      })
      .returning();

    await logger.info("Inquiry created successfully", {
      statusCode: 201,
      inquiryId: newInquiry?.id,
      email: data.email,
    });

    return NextResponse.json({ inquiry: newInquiry }, { status: 201 });
  } catch (error) {
    await logger.error(
      "Error creating inquiry",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  status: z.enum(INQUIRY_STATUSES).optional(),
});

/**
 * GET /api/inquiries
 * List all inquiries for the authenticated advisor.
 * Requires authentication.
 */
export async function GET(request: Request) {
  const logger = createLogger({
    endpoint: "/api/inquiries",
    method: "GET",
  });

  try {
    const { getSession } = await import("@/server/better-auth/server");
    const session = await getSession();

    if (!session?.user) {
      await logger.warn("Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.addContext({ userId: session.user.id });

    const url = new URL(request.url);
    const paginationResult = paginationSchema.safeParse({
      page: url.searchParams.get("page") ?? DEFAULT_PAGE,
      limit: url.searchParams.get("limit") ?? DEFAULT_LIMIT,
      status: url.searchParams.get("status") ?? undefined,
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

    const { page, limit, status } = paginationResult.data;
    const offset = (page - 1) * limit;

    logger.addContext({ page, limit, offset, status });

    const db = getDb();

    let whereClause;
    if (status) {
      whereClause = and(eq(inquiry.status, status), isNull(inquiry.deletedAt));
    } else {
      whereClause = and(
        or(
          eq(inquiry.status, "completed"),
          eq(inquiry.status, "viewed"),
          eq(inquiry.status, "claimed"),
        ),
        isNull(inquiry.deletedAt),
      );
    }

    const totalResult = await db
      .select({ count: count() })
      .from(inquiry)
      .where(whereClause);

    const inquiries = await db.query.inquiry.findMany({
      where: whereClause,
      orderBy: [desc(inquiry.createdAt)],
      limit,
      offset,
    });

    const total = totalResult[0]?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    await logger.info("Inquiries fetched successfully", {
      statusCode: 200,
      inquiryCount: inquiries.length,
      total,
      page,
      totalPages,
    });

    return NextResponse.json({
      inquiries,
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
      "Error fetching inquiries",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
