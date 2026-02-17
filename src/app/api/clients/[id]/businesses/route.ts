import { getDb } from "@/server/db";
import { business } from "@/server/db/schemas";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createBusinessSchema } from "@/lib/validation/business";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";

/**
 * GET /api/clients/[id]/businesses - Get all businesses for a client
 */
export const GET = withApiHandler(
  {
    endpoint: "/api/clients/[id]/businesses",
    method: "GET",
    requireClient: true,
  },
  async (_request, { logger, clientId }) => {
    const db = getDb();

    // Fetch all non-deleted businesses for the client
    const businesses = await db.query.business.findMany({
      where: and(eq(business.clientId, clientId!), isNull(business.deletedAt)),
    });

    await logger.info("Businesses fetched successfully", {
      businessCount: businesses.length,
    });

    return { data: { items: businesses } };
  },
);

/**
 * POST /api/clients/[id]/businesses - Create a new business for a client
 */
export const POST = withApiHandler(
  {
    endpoint: "/api/clients/[id]/businesses",
    method: "POST",
    requireClient: true,
  },
  async (request, { logger, clientId }) => {
    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) {
      return bodyResult.error;
    }

    // Validate request body
    const validationResult = createBusinessSchema.safeParse(bodyResult.body);
    if (!validationResult.success) {
      return handleValidationError(logger, validationResult.error);
    }

    const db = getDb();

    // Create new business
    const [newBusiness] = await db
      .insert(business)
      .values({
        clientId: clientId!,
        name: validationResult.data.name,
        type: validationResult.data.type,
        valuation: validationResult.data.valuation,
        fiscalYearEnd: validationResult.data.fiscalYearEnd ?? undefined,
      })
      .returning();

    if (!newBusiness) {
      await logger.error("Failed to create business - no result returned");
      return NextResponse.json(
        { error: "Failed to create business" },
        { status: 500 },
      );
    }

    await logger.info("Business created successfully", {
      businessId: newBusiness.id,
    });

    return { data: { items: [newBusiness] }, status: 201 };
  },
);
