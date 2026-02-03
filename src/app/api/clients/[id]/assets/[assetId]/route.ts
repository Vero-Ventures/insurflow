import { getDb } from "@/server/db";
import { asset, client } from "@/server/db/schema";
import { and, eq, exists, isNull, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";
import { updateAssetSchema } from "@/lib/validation/asset";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";

/**
 * Creates the ownership verification EXISTS subquery.
 * Ensures client belongs to user and is not deleted.
 */
function createOwnershipCheck(
  db: ReturnType<typeof getDb>,
  clientId: string,
  userId: string,
) {
  return exists(
    db
      .select({ id: client.id })
      .from(client)
      .where(
        and(
          eq(client.id, clientId),
          eq(client.userId, userId),
          isNull(client.deletedAt),
        ),
      ),
  );
}

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

    const db = getDb();

    // Base WHERE conditions for asset queries (DRY)
    const baseWhere: SQL = and(
      eq(asset.id, assetId),
      eq(asset.clientId, clientId!),
      isNull(asset.deletedAt),
    )!;

    // First check if asset exists (to distinguish "not found" from "ownership failed")
    const existingAsset = await db.query.asset.findFirst({
      where: baseWhere,
    });

    if (!existingAsset) {
      await logger.info("Asset not found", { statusCode: 404 });
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Update asset with atomic ownership verification via EXISTS subquery
    // This prevents TOCTOU race condition by checking ownership in the same statement
    const updateData: Record<string, unknown> = {
      ...validationResult.data,
      updatedAt: new Date(),
    };

    const [updatedAsset] = await db
      .update(asset)
      .set(updateData)
      .where(
        and(baseWhere, createOwnershipCheck(db, clientId!, session.user.id)),
      )
      .returning();

    if (!updatedAsset) {
      // Asset exists but ownership check failed - client was reassigned between check and update
      await logger.warn("Client ownership verification failed during update", {
        statusCode: 403,
      });
      return NextResponse.json(
        { error: "Client not found or access denied" },
        { status: 403 },
      );
    }

    await logger.info("Asset updated successfully");
    return { data: { asset: updatedAsset } };
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

    const db = getDb();

    // Base WHERE conditions for asset queries (DRY)
    const baseWhere: SQL = and(
      eq(asset.id, assetId),
      eq(asset.clientId, clientId!),
      isNull(asset.deletedAt),
    )!;

    // First check if asset exists (to distinguish "not found" from "ownership failed")
    const existingAsset = await db.query.asset.findFirst({
      where: baseWhere,
    });

    if (!existingAsset) {
      await logger.info("Asset not found or already deleted", {
        statusCode: 404,
      });
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const now = new Date();

    // Soft delete asset with atomic ownership verification via EXISTS subquery
    // This prevents TOCTOU race condition by checking ownership in the same statement
    const [deletedAsset] = await db
      .update(asset)
      .set({
        deletedAt: now,
        updatedAt: now,
      })
      .where(
        and(baseWhere, createOwnershipCheck(db, clientId!, session.user.id)),
      )
      .returning();

    if (!deletedAsset) {
      // Asset exists but ownership check failed - client was reassigned between check and delete
      await logger.warn("Client ownership verification failed during delete", {
        statusCode: 403,
      });
      return NextResponse.json(
        { error: "Client not found or access denied" },
        { status: 403 },
      );
    }

    await logger.info("Asset soft deleted successfully");
    return { data: { message: "Asset deleted successfully" } };
  },
);
