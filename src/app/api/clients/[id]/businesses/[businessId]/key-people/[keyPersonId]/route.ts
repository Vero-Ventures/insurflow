import { keyPerson } from "@/server/db/schema";
import { updateKeyPersonSchema } from "@/lib/validation/key-person";
import { createItemHandlers } from "@/lib/api/business-resource-helpers";

/**
 * PUT    /api/clients/[id]/businesses/[businessId]/key-people/[keyPersonId] - Update
 * DELETE /api/clients/[id]/businesses/[businessId]/key-people/[keyPersonId] - Soft delete
 */
export const { PUT, DELETE } = createItemHandlers({
  endpoint:
    "/api/clients/[id]/businesses/[businessId]/key-people/[keyPersonId]",
  table: keyPerson,
  resourceIdParam: "keyPersonId",
  resourceName: "Key person",
  responseKey: "keyPerson",
  updateSchema: updateKeyPersonSchema,
});
