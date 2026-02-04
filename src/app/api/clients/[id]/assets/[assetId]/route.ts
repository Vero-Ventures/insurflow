import { NextResponse } from "next/server";
import { updateAssetSchema } from "@/lib/validation/asset";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";
import {
  updateResource,
  deleteResource,
  assetConfig,
} from "@/lib/api/resource-helpers";

/**
 * PATCH /api/clients/[id]/assets/[assetId] - Update an asset
 *
 * Security: Uses EXISTS subquery to atomically verify client ownership
 * in the same UPDATE statement, preventing TOCTOU race conditions.
 */
export const PATCH = withApiHandler(
  {
    endpoint: "/api/clients/[id]/assets/[assetId]",
    method: "PATCH",
    resourceIdParams: ["assetId"],
  },
  async (request, { logger, session, clientId, resourceIds }) => {
    const assetId = resourceIds?.assetId;
    if (!assetId) {
      return NextResponse.json(
        { error: "Asset ID is required" },
        { status: 400 },
      );
    }

    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) {
      return bodyResult.error;
    }

    // Validate request body
    const validationResult = updateAssetSchema.safeParse(bodyResult.body);
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
      config: assetConfig,
      resourceId: assetId,
      clientId: clientId!,
      userId: session.user.id,
      updateData: validationResult.data,
      logger,
    });

    if (!result.success) return result.response;
    return { data: { asset: result.data } };
  },
);

/**
 * DELETE /api/clients/[id]/assets/[assetId] - Soft delete an asset
 *
 * Security: Uses EXISTS subquery to atomically verify client ownership
 * in the same UPDATE statement, preventing TOCTOU race conditions.
 */
export const DELETE = withApiHandler(
  {
    endpoint: "/api/clients/[id]/assets/[assetId]",
    method: "DELETE",
    resourceIdParams: ["assetId"],
  },
  async (_request, { logger, session, clientId, resourceIds }) => {
    const assetId = resourceIds?.assetId;
    if (!assetId) {
      return NextResponse.json(
        { error: "Asset ID is required" },
        { status: 400 },
      );
    }

    const result = await deleteResource({
      config: assetConfig,
      resourceId: assetId,
      clientId: clientId!,
      userId: session.user.id,
      logger,
    });

    if (!result.success) return result.response;
    return { data: { message: "Asset deleted successfully" } };
  },
);
