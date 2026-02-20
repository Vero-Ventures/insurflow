import { NextResponse } from "next/server";
import { updatePolicySchema } from "@/lib/validation/policy";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";
import {
  updateResource,
  deleteResource,
  policyConfig,
} from "@/lib/api/resource-helpers";

/**
 * PATCH /api/clients/[id]/policies/[policyId] - Update a policy
 *
 * Security: Uses EXISTS subquery to atomically verify client ownership
 * in the same UPDATE statement, preventing TOCTOU race conditions.
 */
export const PATCH = withApiHandler(
  {
    endpoint: "/api/clients/[id]/policies/[policyId]",
    method: "PATCH",
    resourceIdParams: ["policyId"],
  },
  async (request, { logger, session, clientId, resourceIds }) => {
    const policyId = resourceIds?.policyId;
    if (!policyId) {
      return NextResponse.json(
        { error: "Policy ID is required" },
        { status: 400 },
      );
    }

    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) return bodyResult.error;

    // Validate request body
    const validationResult = updatePolicySchema.safeParse(bodyResult.body);
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

    const result = await updateResource({
      config: policyConfig,
      resourceId: policyId,
      clientId: clientId!,
      userId: session.user.id,
      updateData: validationResult.data,
      logger,
    });

    if (!result.success) return result.response;
    return { data: { policy: result.data } };
  },
);

/**
 * DELETE /api/clients/[id]/policies/[policyId] - Soft delete a policy
 *
 * Security: Uses EXISTS subquery to atomically verify client ownership
 * in the same UPDATE statement, preventing TOCTOU race conditions.
 */
export const DELETE = withApiHandler(
  {
    endpoint: "/api/clients/[id]/policies/[policyId]",
    method: "DELETE",
    resourceIdParams: ["policyId"],
  },
  async (_request, { logger, session, clientId, resourceIds }) => {
    const policyId = resourceIds?.policyId;
    if (!policyId) {
      return NextResponse.json(
        { error: "Policy ID is required" },
        { status: 400 },
      );
    }

    const result = await deleteResource({
      config: policyConfig,
      resourceId: policyId,
      clientId: clientId!,
      userId: session.user.id,
      logger,
    });

    if (!result.success) return result.response;
    return { data: { message: "Policy deleted successfully" } };
  },
);
