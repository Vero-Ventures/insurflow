import { getDb } from "@/server/db";
import { shareLink } from "@/server/db/schemas";
import { createLogger } from "@/server/axiom";
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getClientIp, getBaseUrl } from "@/lib/api/shared-utils";
import { createShareLinkSchema } from "@/lib/validation/shared-schemas";

function generateToken(): string {
  return randomBytes(9).toString("base64url");
}

const DEFAULT_EXPIRY_DAYS = 2;

/**
 * POST /api/share-links
 * Generate a new share link for the client to share with an advisor.
 * Public endpoint - no authentication required.
 */
export async function POST(request: Request) {
  const logger = createLogger({
    endpoint: "/api/share-links",
    method: "POST",
  });

  try {
    const body = await request.json();
    const validationResult = createShareLinkSchema.safeParse(body);

    if (!validationResult.success) {
      await logger.warn("Invalid share link request", {
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

    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + DEFAULT_EXPIRY_DAYS);

    const consumerIp = await getClientIp(request);
    const userAgent = request.headers.get("user-agent");
    const baseUrl = getBaseUrl(request);

    const [newShareLink] = await db
      .insert(shareLink)
      .values({
        token,
        expiresAt,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || null,
        householdStatus: data.householdStatus || null,
        annualHouseholdIncome: data.annualHouseholdIncome || null,
        totalDebts: data.totalDebts || null,
        currentCoverage: data.currentCoverage || null,
        primaryGoal: data.primaryGoal || null,
        estimatedCoverageNeed: data.estimatedCoverageNeed || null,
        estimatedGap: data.estimatedGap || null,
        estimatedPremium: data.estimatedPremium || null,
        scenarioId: data.scenarioId || null,
        incomeReplacementPercent:
          data.incomeReplacementPercent?.toString() || null,
        replacementDurationYears: data.replacementDurationYears || null,
        liquidAssets: data.liquidAssets?.toString() || null,
        referrerEmail: data.referrerEmail || null,
        consumerIpAddress: consumerIp,
        consumerUserAgent: userAgent,
      })
      .returning();

    const shareUrl = `${baseUrl}/share/${token}`;

    await logger.info("Share link created successfully", {
      statusCode: 201,
      shareLinkId: newShareLink?.id,
      token: token,
      expiresAt: expiresAt.toISOString(),
    });

    return NextResponse.json(
      {
        shareLink: newShareLink,
        shareUrl,
        expiresAt: expiresAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    await logger.error(
      "Error creating share link",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/share-links
 * List all share links (for advisors) with pagination.
 * Requires authentication.
 */
export async function GET(request: Request) {
  const logger = createLogger({
    endpoint: "/api/share-links",
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
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)),
    );
    const offset = (page - 1) * limit;

    const db = getDb();
    const { isNull, desc, and, count } = await import("drizzle-orm");

    const whereClause = and(isNull(shareLink.deletedAt));

    const [totalResult] = await db
      .select({ count: count() })
      .from(shareLink)
      .where(whereClause);

    const total = totalResult?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    const shareLinks = await db.query.shareLink.findMany({
      where: whereClause,
      orderBy: [desc(shareLink.createdAt)],
      limit,
      offset,
    });

    await logger.info("Share links fetched successfully", {
      statusCode: 200,
      shareLinkCount: shareLinks.length,
      total,
      page,
      totalPages,
    });

    return NextResponse.json({
      shareLinks,
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
      "Error fetching share links",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
