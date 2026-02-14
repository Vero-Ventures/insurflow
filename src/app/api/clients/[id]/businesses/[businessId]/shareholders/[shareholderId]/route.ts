import { shareholder } from "@/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { updateShareholderSchema } from "@/lib/validation/shareholder";
import { createItemHandlers } from "@/lib/api/business-resource-helpers";
import { computeCurrentOwnership } from "@/lib/calculations/shareholder-analysis";

/**
 * PUT    /api/clients/[id]/businesses/[businessId]/shareholders/[shareholderId] - Update
 * DELETE /api/clients/[id]/businesses/[businessId]/shareholders/[shareholderId] - Soft delete
 *
 * PUT validates that total ownership percentage does not exceed 100% after update.
 */
export const { PUT, DELETE } = createItemHandlers({
  endpoint:
    "/api/clients/[id]/businesses/[businessId]/shareholders/[shareholderId]",
  table: shareholder,
  resourceIdParam: "shareholderId",
  resourceName: "Shareholder",
  responseKey: "shareholder",
  updateSchema: updateShareholderSchema,
  beforeUpdate: async ({
    businessId,
    resourceId,
    validatedData,
    db,
    logger,
  }) => {
    // If ownership percentage is being updated, check the total constraint
    if (validatedData.ownershipPercentage !== undefined) {
      const allShareholders = await db.query.shareholder.findMany({
        where: and(
          eq(shareholder.businessId, businessId),
          isNull(shareholder.deletedAt),
        ),
        columns: { id: true, ownershipPercentage: true },
      });

      // Compute total excluding the current shareholder, then add the new value
      const othersTotal = computeCurrentOwnership(allShareholders, resourceId);
      const newPercentage =
        parseFloat(validatedData.ownershipPercentage as string) || 0;

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

    return null;
  },
});
