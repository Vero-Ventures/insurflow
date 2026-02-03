import { NextResponse } from "next/server";
import { updateDebtSchema } from "@/lib/validation/debt";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";
import {
  updateResource,
  deleteResource,
  debtConfig,
} from "@/lib/api/resource-helpers";

/**
 * PATCH /api/clients/[id]/debts/[debtId] - Update a debt
 *
 * Security: Uses EXISTS subquery to atomically verify client ownership
 * in the same UPDATE statement, preventing TOCTOU race conditions.
 */
export const PATCH = withApiHandler(
  {
    endpoint: "/api/clients/[id]/debts/[debtId]",
    method: "PATCH",
    resourceIdParams: ["debtId"],
  },
  async (request, { logger, session, clientId, resourceIds }) => {
    const debtId = resourceIds?.debtId;
    if (!debtId) {
      return NextResponse.json(
        { error: "Debt ID is required" },
        { status: 400 },
      );
    }

    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) return bodyResult.error;

    // Validate request body
    const validationResult = updateDebtSchema.safeParse(bodyResult.body);
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
      config: debtConfig,
      resourceId: debtId,
      clientId: clientId!,
      userId: session.user.id,
      updateData: validationResult.data,
      logger,
    });

    if (!result.success) return result.response;
    return { data: { debt: result.data } };
  },
);

/**
 * DELETE /api/clients/[id]/debts/[debtId] - Soft delete a debt
 *
 * Security: Uses EXISTS subquery to atomically verify client ownership
 * in the same UPDATE statement, preventing TOCTOU race conditions.
 */
export const DELETE = withApiHandler(
  {
    endpoint: "/api/clients/[id]/debts/[debtId]",
    method: "DELETE",
    resourceIdParams: ["debtId"],
  },
  async (_request, { logger, session, clientId, resourceIds }) => {
    const debtId = resourceIds?.debtId;
    if (!debtId) {
      return NextResponse.json(
        { error: "Debt ID is required" },
        { status: 400 },
      );
    }

    const result = await deleteResource({
      config: debtConfig,
      resourceId: debtId,
      clientId: clientId!,
      userId: session.user.id,
      logger,
    });

    if (!result.success) return result.response;
    return { data: { message: "Debt deleted successfully" } };
  },
);
