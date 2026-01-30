import { getDb } from "@/server/db";
import { asset } from "@/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { updateAssetSchema } from "@/lib/validation/asset";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";

/**
 * PATCH /api/clients/[id]/assets/[assetId] - Update an asset
 */
export const PATCH = withApiHandler(
  {
    endpoint: "/api/clients/[id]/assets/[assetId]",
    method: "PATCH",
    requireClient: true,
    resourceIdParams: ["assetId"],
  },
  async (request, { logger, clientId, resourceIds }) => {
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

    const db = getDb();

    // Update asset with ownership and deletion checks
    const updateData: Record<string, unknown> = {
      ...validationResult.data,
      updatedAt: new Date(),
    };

    const [updatedAsset] = await db
      .update(asset)
      .set(updateData)
      .where(
        and(
          eq(asset.id, assetId),
          eq(asset.clientId, clientId!),
          isNull(asset.deletedAt),
        ),
      )
      .returning();

    if (!updatedAsset) {
      await logger.info("Asset not found", { statusCode: 404 });
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    await logger.info("Asset updated successfully");
    return { data: { asset: updatedAsset } };
  },
);

/**
 * DELETE /api/clients/[id]/assets/[assetId] - Soft delete an asset
 */
export const DELETE = withApiHandler(
  {
    endpoint: "/api/clients/[id]/assets/[assetId]",
    method: "DELETE",
    requireClient: true,
    resourceIdParams: ["assetId"],
  },
  async (_request, { logger, clientId, resourceIds }) => {
    const assetId = resourceIds?.assetId;
    if (!assetId) {
      return NextResponse.json(
        { error: "Asset ID is required" },
        { status: 400 },
      );
    }

    const db = getDb();
    const now = new Date();

    // Soft delete asset with ownership and deletion check
    const [deletedAsset] = await db
      .update(asset)
      .set({
        deletedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(asset.id, assetId),
          eq(asset.clientId, clientId!),
          isNull(asset.deletedAt),
        ),
      )
      .returning();

    if (!deletedAsset) {
      await logger.info("Asset not found or already deleted", {
        statusCode: 404,
      });
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    await logger.info("Asset soft deleted successfully");
    return { data: { message: "Asset deleted successfully" } };
  },
);
