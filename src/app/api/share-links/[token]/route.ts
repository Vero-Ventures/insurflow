import { getDb } from "@/server/db";
import { shareLink, inquiry } from "@/server/db/schemas";
import { createLogger } from "@/server/axiom";
import { eq, isNull, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const TOKEN_REGEX = /^[a-z0-9]{12}$/;

function validateToken(token: string): NextResponse | null {
  if (!TOKEN_REGEX.test(token)) {
    return NextResponse.json(
      { error: "Invalid token format" },
      { status: 400 },
    );
  }
  return null;
}

/**
 * GET /api/share-links/[token]
 * Get share link details by token (public).
 * Marks link as viewed on access.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const resolvedParams = await params;
  const logger = createLogger({
    endpoint: `/api/share-links/${resolvedParams.token}`,
    method: "GET",
  });

  try {
    const tokenError = validateToken(resolvedParams.token);
    if (tokenError) return tokenError;

    const db = getDb();

    const foundLink = await db.query.shareLink.findFirst({
      where: and(
        eq(shareLink.token, resolvedParams.token),
        isNull(shareLink.deletedAt),
      ),
    });

    if (!foundLink) {
      await logger.info("Share link not found", { statusCode: 404 });
      return NextResponse.json(
        { error: "Share link not found or has expired" },
        { status: 404 },
      );
    }

    const now = new Date();
    const expiresAt = new Date(foundLink.expiresAt);

    if (foundLink.status === "expired" || expiresAt < now) {
      await db
        .update(shareLink)
        .set({ status: "expired" })
        .where(eq(shareLink.id, foundLink.id));

      await logger.info("Share link expired", { statusCode: 410 });
      return NextResponse.json(
        { error: "This share link has expired" },
        { status: 410 },
      );
    }

    const hasBeenViewed = foundLink.viewedAt !== null;

    if (!hasBeenViewed) {
      await db
        .update(shareLink)
        .set({
          status: "viewed",
          viewedAt: new Date(),
        })
        .where(eq(shareLink.id, foundLink.id));
    }

    await logger.info("Share link accessed", {
      statusCode: 200,
      shareLinkId: foundLink.id,
    });

    return NextResponse.json({
      shareLink: {
        ...foundLink,
        firstName: foundLink.firstName,
        lastName: foundLink.lastName,
        householdStatus: foundLink.householdStatus,
        annualHouseholdIncome: foundLink.annualHouseholdIncome,
        totalDebts: foundLink.totalDebts,
        currentCoverage: foundLink.currentCoverage,
        primaryGoal: foundLink.primaryGoal,
        estimatedCoverageNeed: foundLink.estimatedCoverageNeed,
        estimatedGap: foundLink.estimatedGap,
        scenarioId: foundLink.scenarioId,
      },
    });
  } catch (error) {
    await logger.error(
      "Error fetching share link",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

const interestedSchema = z.object({
  advisorEmail: z.string().email("Valid email is required").optional(),
});

/**
 * POST /api/share-links/[token]/interested
 * Mark share link as interested (advisor wants to follow up).
 * Creates an inquiry in the system.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const resolvedParams = await params;
  const logger = createLogger({
    endpoint: `/api/share-links/${resolvedParams.token}/interested`,
    method: "POST",
  });

  try {
    const tokenError = validateToken(resolvedParams.token);
    if (tokenError) return tokenError;

    const { getSession } = await import("@/server/better-auth/server");
    const session = await getSession();

    if (!session?.user) {
      await logger.warn("Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.addContext({ userId: session.user.id });

    const body = await request.json();
    const validationResult = interestedSchema.safeParse(body);

    if (!validationResult.success) {
      await logger.warn("Invalid interested request", {
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

    const foundLink = await db.query.shareLink.findFirst({
      where: and(
        eq(shareLink.token, resolvedParams.token),
        isNull(shareLink.deletedAt),
      ),
    });

    if (!foundLink) {
      await logger.info("Share link not found", { statusCode: 404 });
      return NextResponse.json(
        { error: "Share link not found or has expired" },
        { status: 404 },
      );
    }

    const now = new Date();
    const expiresAt = new Date(foundLink.expiresAt);

    if (foundLink.status === "expired" || expiresAt < now) {
      return NextResponse.json(
        { error: "This share link has expired" },
        { status: 410 },
      );
    }

    const [updatedLink] = await db
      .update(shareLink)
      .set({
        status: "interested",
        interestedAt: now,
        claimedByUserId: session.user.id,
      })
      .where(eq(shareLink.id, foundLink.id))
      .returning();

    const [newInquiry] = await db
      .insert(inquiry)
      .values({
        firstName: foundLink.firstName,
        lastName: foundLink.lastName,
        email: foundLink.email,
        phone: foundLink.phone,
        householdStatus: foundLink.householdStatus,
        annualHouseholdIncome: foundLink.annualHouseholdIncome,
        totalDebts: foundLink.totalDebts,
        currentCoverage: foundLink.currentCoverage,
        primaryGoal: foundLink.primaryGoal,
        estimatedCoverageNeed: foundLink.estimatedCoverageNeed,
        estimatedPremium: foundLink.estimatedPremium,
        scenarioId: foundLink.scenarioId,
        status: "claimed",
        claimedByUserId: session.user.id,
        claimedAt: now,
      })
      .returning();

    if (!newInquiry) {
      await logger.error("Failed to create inquiry");
      return NextResponse.json(
        { error: "Failed to create inquiry" },
        { status: 500 },
      );
    }

    await logger.info("Advisor marked interested, inquiry created", {
      statusCode: 200,
      shareLinkId: foundLink.id,
      inquiryId: newInquiry.id,
    });

    return NextResponse.json({
      success: true,
      shareLink: updatedLink,
      inquiry: newInquiry,
    });
  } catch (error) {
    await logger.error(
      "Error marking interested",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
