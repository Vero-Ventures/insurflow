import { getDb } from "@/server/db";
import { shareholder } from "@/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createShareholderSchema } from "@/lib/validation/shareholder";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";
import { verifyBusinessOwnership } from "@/lib/api/client-helpers";
import { computeCurrentOwnership } from "@/lib/calculations/shareholder-analysis";

/**
 * GET /api/clients/[id]/businesses/[businessId]/shareholders - List shareholders for a business
 */
export const GET = withApiHandler(
  {
    endpoint: "/api/clients/[id]/businesses/[businessId]/shareholders",
    method: "GET",
    requireClient: true,
    resourceIdParams: ["businessId"],
  },
  async (_request, { logger, clientId, resourceIds }) => {
    const businessId = resourceIds?.businessId;
    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 },
      );
    }

    // Verify business belongs to this client
    const foundBusiness = await verifyBusinessOwnership(businessId, clientId!);
    if (!foundBusiness) {
      await logger.info("Business not found", { statusCode: 404 });
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 },
      );
    }

    const db = getDb();

    const shareholders = await db.query.shareholder.findMany({
      where: and(
        eq(shareholder.businessId, businessId),
        isNull(shareholder.deletedAt),
      ),
    });

    await logger.info("Shareholders fetched successfully", {
      shareholderCount: shareholders.length,
    });

    return { data: { items: shareholders } };
  },
);

/**
 * POST /api/clients/[id]/businesses/[businessId]/shareholders - Create a shareholder
 *
 * Validates that total ownership percentage does not exceed 100%.
 */
export const POST = withApiHandler(
  {
    endpoint: "/api/clients/[id]/businesses/[businessId]/shareholders",
    method: "POST",
    requireClient: true,
    resourceIdParams: ["businessId"],
  },
  async (request, { logger, clientId, resourceIds }) => {
    const businessId = resourceIds?.businessId;
    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 },
      );
    }

    // Verify business belongs to this client
    const foundBusiness = await verifyBusinessOwnership(businessId, clientId!);
    if (!foundBusiness) {
      await logger.info("Business not found", { statusCode: 404 });
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 },
      );
    }

    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) {
      return bodyResult.error;
    }

    // Validate request body
    const validationResult = createShareholderSchema.safeParse(bodyResult.body);
    if (!validationResult.success) {
      return handleValidationError(logger, validationResult.error);
    }

    const db = getDb();

    // Check total ownership constraint
    const existingShareholders = await db.query.shareholder.findMany({
      where: and(
        eq(shareholder.businessId, businessId),
        isNull(shareholder.deletedAt),
      ),
      columns: { id: true, ownershipPercentage: true },
    });

    const currentTotal = computeCurrentOwnership(existingShareholders);
    const newPercentage =
      parseFloat(validationResult.data.ownershipPercentage) || 0;

    if (currentTotal + newPercentage > 100) {
      await logger.warn("Total ownership percentage would exceed 100%", {
        currentTotal,
        newPercentage,
        wouldBeTotal: currentTotal + newPercentage,
      });
      return NextResponse.json(
        {
          error: "Validation failed",
          details: {
            ownershipPercentage: `Total ownership would be ${currentTotal + newPercentage}%, which exceeds 100%. Current total is ${currentTotal}%.`,
          },
        },
        { status: 400 },
      );
    }

    const [newShareholder] = await db
      .insert(shareholder)
      .values({
        businessId,
        name: validationResult.data.name,
        ownershipPercentage: validationResult.data.ownershipPercentage,
      })
      .returning();

    if (!newShareholder) {
      await logger.error("Failed to create shareholder - no result returned");
      return NextResponse.json(
        { error: "Failed to create shareholder" },
        { status: 500 },
      );
    }

    await logger.info("Shareholder created successfully", {
      shareholderId: newShareholder.id,
    });

    return { data: { items: [newShareholder] }, status: 201 };
  },
);
