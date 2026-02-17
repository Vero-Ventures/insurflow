import { keyPerson } from "@/server/db/schemas";
import { createKeyPersonSchema } from "@/lib/validation/key-person";
import { createCollectionHandlers } from "@/lib/api/business-resource-helpers";

/**
 * GET  /api/clients/[id]/businesses/[businessId]/key-people - List key people
 * POST /api/clients/[id]/businesses/[businessId]/key-people - Create a key person
 */
export const { GET, POST } = createCollectionHandlers({
  endpoint: "/api/clients/[id]/businesses/[businessId]/key-people",
  table: keyPerson,
  resourceName: "Key person",
  createSchema: createKeyPersonSchema,
});
