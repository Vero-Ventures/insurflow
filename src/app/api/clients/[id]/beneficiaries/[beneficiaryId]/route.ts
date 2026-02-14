import { NextResponse } from "next/server";
import { updateBeneficiarySchema } from "@/lib/validation/beneficiary";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";
import {
  updateResource,
  deleteResource,
  beneficiaryConfig,
} from "@/lib/api/resource-helpers";

/**
 * PATCH /api/clients/[id]/beneficiaries/[beneficiaryId] - Update a beneficiary
 *
 * Security: Uses EXISTS subquery to atomically verify client ownership
 * in the same UPDATE statement, preventing TOCTOU race conditions.
 */
export const PATCH = withApiHandler(
  {
    endpoint: "/api/clients/[id]/beneficiaries/[beneficiaryId]",
    method: "PATCH",
    resourceIdParams: ["beneficiaryId"],
  },
  async (request, { logger, session, clientId, resourceIds }) => {
    const beneficiaryId = resourceIds?.beneficiaryId;
    if (!beneficiaryId) {
      return NextResponse.json(
        { error: "Beneficiary ID is required" },
        { status: 400 },
      );
    }

    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) {
      return bodyResult.error;
    }

    // Validate request body
    const validationResult = updateBeneficiarySchema.safeParse(bodyResult.body);
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
      config: beneficiaryConfig,
      resourceId: beneficiaryId,
      clientId: clientId!,
      userId: session.user.id,
      updateData: validationResult.data,
      logger,
    });

    if (!result.success) return result.response;
    return { data: { beneficiary: result.data } };
  },
);

/**
 * DELETE /api/clients/[id]/beneficiaries/[beneficiaryId] - Soft delete a beneficiary
 *
 * Security: Uses EXISTS subquery to atomically verify client ownership
 * in the same UPDATE statement, preventing TOCTOU race conditions.
 */
export const DELETE = withApiHandler(
  {
    endpoint: "/api/clients/[id]/beneficiaries/[beneficiaryId]",
    method: "DELETE",
    resourceIdParams: ["beneficiaryId"],
  },
  async (_request, { logger, session, clientId, resourceIds }) => {
    const beneficiaryId = resourceIds?.beneficiaryId;
    if (!beneficiaryId) {
      return NextResponse.json(
        { error: "Beneficiary ID is required" },
        { status: 400 },
      );
    }

    const result = await deleteResource({
      config: beneficiaryConfig,
      resourceId: beneficiaryId,
      clientId: clientId!,
      userId: session.user.id,
      logger,
    });

    if (!result.success) return result.response;
    return { data: { message: "Beneficiary deleted successfully" } };
  },
);
