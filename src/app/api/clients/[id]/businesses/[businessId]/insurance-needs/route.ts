import { getDb } from "@/server/db";
import { corporateInsuranceNeed } from "@/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createInsuranceNeedSchema } from "@/lib/validation/insurance-need";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";
import { verifyBusinessOwnership } from "@/lib/api/client-helpers";

/**
 * GET /api/clients/[id]/businesses/[businessId]/insurance-needs - List insurance needs for a business
 */
export const GET = withApiHandler(
  {
    endpoint: "/api/clients/[id]/businesses/[businessId]/insurance-needs",
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

    const insuranceNeeds = await db.query.corporateInsuranceNeed.findMany({
      where: and(
        eq(corporateInsuranceNeed.businessId, businessId),
        isNull(corporateInsuranceNeed.deletedAt),
      ),
    });

    await logger.info("Insurance needs fetched successfully", {
      insuranceNeedCount: insuranceNeeds.length,
    });

    return { data: { items: insuranceNeeds } };
  },
);

/**
 * POST /api/clients/[id]/businesses/[businessId]/insurance-needs - Create an insurance need
 */
export const POST = withApiHandler(
  {
    endpoint: "/api/clients/[id]/businesses/[businessId]/insurance-needs",
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
    const validationResult = createInsuranceNeedSchema.safeParse(
      bodyResult.body,
    );
    if (!validationResult.success) {
      return handleValidationError(logger, validationResult.error);
    }

    const db = getDb();

    const [newInsuranceNeed] = await db
      .insert(corporateInsuranceNeed)
      .values({
        businessId,
        insuranceType: validationResult.data.insuranceType,
        coverageAmount: validationResult.data.coverageAmount,
        notes: validationResult.data.notes ?? undefined,
      })
      .returning();

    if (!newInsuranceNeed) {
      await logger.error(
        "Failed to create insurance need - no result returned",
      );
      return NextResponse.json(
        { error: "Failed to create insurance need" },
        { status: 500 },
      );
    }

    await logger.info("Insurance need created successfully", {
      insuranceNeedId: newInsuranceNeed.id,
    });

    return { data: { items: [newInsuranceNeed] }, status: 201 };
  },
);
