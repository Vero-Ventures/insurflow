import { shareholder } from "@/server/db/schema";
import { createShareholderSchema } from "@/lib/validation/shareholder";
import { createCollectionHandlers } from "@/lib/api/business-resource-helpers";
import { validateShareholderOwnershipTotal } from "@/server/business/ownership-utils";

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
  beforeCreate: async ({ businessId, validatedData, db, logger }) =>
    validateShareholderOwnershipTotal(
      db,
      businessId,
      validatedData.ownershipPercentage as string,
      logger,
    ),
});
