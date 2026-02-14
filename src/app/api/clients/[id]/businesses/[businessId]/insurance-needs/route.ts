import { corporateInsuranceNeed } from "@/server/db/schema";
import { createInsuranceNeedSchema } from "@/lib/validation/insurance-need";
import { createCollectionHandlers } from "@/lib/api/business-resource-helpers";

/**
 * GET  /api/clients/[id]/businesses/[businessId]/insurance-needs - List insurance needs
 * POST /api/clients/[id]/businesses/[businessId]/insurance-needs - Create an insurance need
 */
export const { GET, POST } = createCollectionHandlers({
  endpoint: "/api/clients/[id]/businesses/[businessId]/insurance-needs",
  table: corporateInsuranceNeed,
  resourceName: "Insurance need",
  createSchema: createInsuranceNeedSchema,
});
