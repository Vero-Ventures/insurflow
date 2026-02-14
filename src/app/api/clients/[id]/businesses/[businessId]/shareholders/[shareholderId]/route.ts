import { getDb } from "@/server/db";
import { shareholder } from "@/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { updateShareholderSchema } from "@/lib/validation/shareholder";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";
import { verifyBusinessOwnership } from "@/lib/api/client-helpers";
import { computeCurrentOwnership } from "@/lib/calculations/shareholder-analysis";

/**
 * PUT /api/clients/[id]/businesses/[businessId]/shareholders/[shareholderId] - Update a shareholder
 *
 * Validates that total ownership percentage does not exceed 100% after update.
 */
export const PUT = withApiHandler(
  {
    endpoint:
      "/api/clients/[id]/businesses/[businessId]/shareholders/[shareholderId]",
    method: "PUT",
    requireClient: true,
    resourceIdParams: ["businessId", "shareholderId"],
  },
  async (request, { logger, clientId, resourceIds }) => {
    const businessId = resourceIds?.businessId;
    const shareholderId = resourceIds?.shareholderId;
    if (!businessId || !shareholderId) {
      return NextResponse.json(
        { error: "Business ID and Shareholder ID are required" },
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
    const validationResult = updateShareholderSchema.safeParse(bodyResult.body);
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

    // Find existing shareholder
    const existingShareholder = await db.query.shareholder.findFirst({
      where: and(
        eq(shareholder.id, shareholderId),
        eq(shareholder.businessId, businessId),
        isNull(shareholder.deletedAt),
      ),
    });

    if (!existingShareholder) {
      await logger.info("Shareholder not found", { statusCode: 404 });
      return NextResponse.json(
        { error: "Shareholder not found" },
        { status: 404 },
      );
    }

    // If ownership percentage is being updated, check the total constraint
    if (validationResult.data.ownershipPercentage !== undefined) {
      const allShareholders = await db.query.shareholder.findMany({
        where: and(
          eq(shareholder.businessId, businessId),
          isNull(shareholder.deletedAt),
        ),
        columns: { id: true, ownershipPercentage: true },
      });

      // Compute total excluding the current shareholder, then add the new value
      const othersTotal = computeCurrentOwnership(
        allShareholders,
        shareholderId,
      );
      const newPercentage =
        parseFloat(validationResult.data.ownershipPercentage) || 0;

      if (othersTotal + newPercentage > 100) {
        await logger.warn("Total ownership percentage would exceed 100%", {
          othersTotal,
          newPercentage,
          wouldBeTotal: othersTotal + newPercentage,
        });
        return NextResponse.json(
          {
            error: "Validation failed",
            details: {
              ownershipPercentage: `Total ownership would be ${othersTotal + newPercentage}%, which exceeds 100%. Other shareholders total ${othersTotal}%.`,
            },
          },
          { status: 400 },
        );
      }
    }

    // Update the shareholder
    const [updatedShareholder] = await db
      .update(shareholder)
      .set({
        ...validationResult.data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(shareholder.id, shareholderId),
          eq(shareholder.businessId, businessId),
          isNull(shareholder.deletedAt),
        ),
      )
      .returning();

    if (!updatedShareholder) {
      await logger.error("Failed to update shareholder");
      return NextResponse.json(
        { error: "Failed to update shareholder" },
        { status: 500 },
      );
    }

    await logger.info("Shareholder updated successfully", {
      shareholderId: updatedShareholder.id,
    });

    return { data: { shareholder: updatedShareholder } };
  },
);

/**
 * DELETE /api/clients/[id]/businesses/[businessId]/shareholders/[shareholderId] - Soft delete a shareholder
 */
export const DELETE = withApiHandler(
  {
    endpoint:
      "/api/clients/[id]/businesses/[businessId]/shareholders/[shareholderId]",
    method: "DELETE",
    requireClient: true,
    resourceIdParams: ["businessId", "shareholderId"],
  },
  async (_request, { logger, clientId, resourceIds }) => {
    const businessId = resourceIds?.businessId;
    const shareholderId = resourceIds?.shareholderId;
    if (!businessId || !shareholderId) {
      return NextResponse.json(
        { error: "Business ID and Shareholder ID are required" },
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

    // Find and soft-delete the shareholder
    const now = new Date();
    const [deletedShareholder] = await db
      .update(shareholder)
      .set({
        deletedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(shareholder.id, shareholderId),
          eq(shareholder.businessId, businessId),
          isNull(shareholder.deletedAt),
        ),
      )
      .returning();

    if (!deletedShareholder) {
      await logger.info("Shareholder not found", { statusCode: 404 });
      return NextResponse.json(
        { error: "Shareholder not found" },
        { status: 404 },
      );
    }

    await logger.info("Shareholder deleted successfully", {
      shareholderId: deletedShareholder.id,
    });

    return { data: { message: "Shareholder deleted successfully" } };
  },
);
