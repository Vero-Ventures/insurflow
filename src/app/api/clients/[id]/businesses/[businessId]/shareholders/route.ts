import { shareholder } from "@/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createShareholderSchema } from "@/lib/validation/shareholder";
import { createCollectionHandlers } from "@/lib/api/business-resource-helpers";
import { computeCurrentOwnership } from "@/lib/calculations/shareholder-analysis";

/**
 * GET  /api/clients/[id]/businesses/[businessId]/shareholders - List shareholders
 * POST /api/clients/[id]/businesses/[businessId]/shareholders - Create a shareholder
 *
 * POST validates that total ownership percentage does not exceed 100%.
 */
export const { GET, POST } = createCollectionHandlers({
  endpoint: "/api/clients/[id]/businesses/[businessId]/shareholders",
  table: shareholder,
  resourceName: "Shareholder",
  createSchema: createShareholderSchema,
  beforeCreate: async ({ businessId, validatedData, db, logger }) => {
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
      parseFloat(validatedData.ownershipPercentage as string) || 0;

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

    return null;
  },
});
