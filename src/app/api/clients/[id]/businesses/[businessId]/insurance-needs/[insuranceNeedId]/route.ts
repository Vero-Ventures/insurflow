import { getDb } from "@/server/db";
import { corporateInsuranceNeed } from "@/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { updateInsuranceNeedSchema } from "@/lib/validation/insurance-need";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";
import { verifyBusinessOwnership } from "@/lib/api/client-helpers";

/**
 * PUT /api/clients/[id]/businesses/[businessId]/insurance-needs/[insuranceNeedId] - Update an insurance need
 */
export const PUT = withApiHandler(
  {
    endpoint:
      "/api/clients/[id]/businesses/[businessId]/insurance-needs/[insuranceNeedId]",
    method: "PUT",
    requireClient: true,
    resourceIdParams: ["businessId", "insuranceNeedId"],
  },
  async (request, { logger, clientId, resourceIds }) => {
    const businessId = resourceIds?.businessId;
    const insuranceNeedId = resourceIds?.insuranceNeedId;
    if (!businessId || !insuranceNeedId) {
      return NextResponse.json(
        { error: "Business ID and Insurance Need ID are required" },
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
    const validationResult = updateInsuranceNeedSchema.safeParse(
      bodyResult.body,
    );
    if (!validationResult.success) {
      return handleValidationError(logger, validationResult.error);
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

    // Find the insurance need (must belong to this business and not be deleted)
    const existingNeed = await db.query.corporateInsuranceNeed.findFirst({
      where: and(
        eq(corporateInsuranceNeed.id, insuranceNeedId),
        eq(corporateInsuranceNeed.businessId, businessId),
        isNull(corporateInsuranceNeed.deletedAt),
      ),
    });

    if (!existingNeed) {
      await logger.info("Insurance need not found", { statusCode: 404 });
      return NextResponse.json(
        { error: "Insurance need not found" },
        { status: 404 },
      );
    }

    // Update the insurance need
    const [updatedNeed] = await db
      .update(corporateInsuranceNeed)
      .set({
        ...validationResult.data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(corporateInsuranceNeed.id, insuranceNeedId),
          eq(corporateInsuranceNeed.businessId, businessId),
          isNull(corporateInsuranceNeed.deletedAt),
        ),
      )
      .returning();

    if (!updatedNeed) {
      await logger.error("Failed to update insurance need");
      return NextResponse.json(
        { error: "Failed to update insurance need" },
        { status: 500 },
      );
    }

    await logger.info("Insurance need updated successfully", {
      insuranceNeedId: updatedNeed.id,
    });

    return { data: { insuranceNeed: updatedNeed } };
  },
);

/**
 * DELETE /api/clients/[id]/businesses/[businessId]/insurance-needs/[insuranceNeedId] - Soft delete an insurance need
 */
export const DELETE = withApiHandler(
  {
    endpoint:
      "/api/clients/[id]/businesses/[businessId]/insurance-needs/[insuranceNeedId]",
    method: "DELETE",
    requireClient: true,
    resourceIdParams: ["businessId", "insuranceNeedId"],
  },
  async (_request, { logger, clientId, resourceIds }) => {
    const businessId = resourceIds?.businessId;
    const insuranceNeedId = resourceIds?.insuranceNeedId;
    if (!businessId || !insuranceNeedId) {
      return NextResponse.json(
        { error: "Business ID and Insurance Need ID are required" },
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

    // Find and soft-delete the insurance need
    const now = new Date();
    const [deletedNeed] = await db
      .update(corporateInsuranceNeed)
      .set({
        deletedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(corporateInsuranceNeed.id, insuranceNeedId),
          eq(corporateInsuranceNeed.businessId, businessId),
          isNull(corporateInsuranceNeed.deletedAt),
        ),
      )
      .returning();

    if (!deletedNeed) {
      await logger.info("Insurance need not found", { statusCode: 404 });
      return NextResponse.json(
        { error: "Insurance need not found" },
        { status: 404 },
      );
    }

    await logger.info("Insurance need deleted successfully", {
      insuranceNeedId: deletedNeed.id,
    });

    return { data: { message: "Insurance need deleted successfully" } };
  },
);
