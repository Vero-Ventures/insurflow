import { getDb } from "@/server/db";
import { shareLink } from "@/server/db/schemas";
import { createLogger } from "@/server/axiom";
import { NextResponse } from "next/server";
import { z } from "zod";

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getBaseUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

const createShareLinkSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Valid email is required"),
  phone: z.string().max(20).optional(),
  householdStatus: z
    .enum(["single", "married", "partnered", "single_parent"])
    .optional(),
  annualHouseholdIncome: z.string().optional(),
  totalDebts: z.string().optional(),
  currentCoverage: z.string().optional(),
  primaryGoal: z.string().max(2000).optional(),
  estimatedCoverageNeed: z.string().optional(),
  estimatedGap: z.string().optional(),
  scenarioId: z.string().optional(),
  incomeReplacementPercent: z.number().optional(),
  replacementDurationYears: z.number().optional(),
  liquidAssets: z.number().optional(),
  referrerEmail: z.string().email().optional(),
});

const DEFAULT_EXPIRY_DAYS = 2;

async function getClientIp(request: Request): Promise<string | null> {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]!.trim();
  }
  return request.headers.get("x-real-ip") || null;
}

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
 * List all share links (for advisors).
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

    const db = getDb();
    const { eq, isNull, desc, and } = await import("drizzle-orm");

    const shareLinks = await db.query.shareLink.findMany({
      where: and(isNull(shareLink.deletedAt)),
      orderBy: [desc(shareLink.createdAt)],
      limit: 100,
    });

    await logger.info("Share links fetched successfully", {
      statusCode: 200,
      shareLinkCount: shareLinks.length,
    });

    return NextResponse.json({ shareLinks });
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
