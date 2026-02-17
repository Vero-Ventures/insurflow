import { corporateInsuranceNeed } from "@/server/db/schemas";
import { updateInsuranceNeedSchema } from "@/lib/validation/insurance-need";
import { createItemHandlers } from "@/lib/api/business-resource-helpers";

/**
 * PUT    /api/clients/[id]/businesses/[businessId]/insurance-needs/[insuranceNeedId] - Update
 * DELETE /api/clients/[id]/businesses/[businessId]/insurance-needs/[insuranceNeedId] - Soft delete
 */
export const { PUT, DELETE } = createItemHandlers({
  endpoint:
    "/api/clients/[id]/businesses/[businessId]/insurance-needs/[insuranceNeedId]",
  table: corporateInsuranceNeed,
  resourceIdParam: "insuranceNeedId",
  resourceName: "Insurance need",
  responseKey: "insuranceNeed",
  updateSchema: updateInsuranceNeedSchema,
});
