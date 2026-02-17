import { shareholder } from "@/server/db/schemas";
import { updateShareholderSchema } from "@/lib/validation/shareholder";
import { createItemHandlers } from "@/lib/api/business-resource-helpers";
import { validateShareholderOwnershipTotal } from "@/server/business/ownership-utils";

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
  withBusinessLock: true,
  beforeUpdate: async ({
    businessId,
    resourceId,
    validatedData,
    db,
    logger,
  }) => {
    if (validatedData.ownershipPercentage === undefined) return null;
    return validateShareholderOwnershipTotal(
      db,
      businessId,
      validatedData.ownershipPercentage as string,
      logger,
      resourceId,
    );
  },
});
