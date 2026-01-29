import { getDb } from "@/server/db";
import { asset } from "@/server/db/schema";
import { createLogger } from "@/server/axiom";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { updateAssetSchema } from "@/lib/validation/asset";
import { validateUUID, verifyClientOwnership } from "@/lib/api/client-helpers";
import {
  validateSession,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";

/**
 * PATCH /api/clients/[clientId]/assets/[assetId] - Update an asset
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; assetId: string }> },
) {
  const { id: clientId, assetId } = await params;
  const logger = createLogger({
    endpoint: `/api/clients/${clientId}/assets/${assetId}`,
    method: "PATCH",
  });

  try {
    const sessionResult = await validateSession(logger);
    if ("error" in sessionResult) return sessionResult.error;
    const { session } = sessionResult;

    logger.addContext({
      userId: session.user.id,
      clientId,
      assetId,
    });

    // Validate UUID formats
    const clientError = validateUUID(clientId, "client ID");
    if (clientError) {
      await logger.warn("Invalid client ID format");
      return clientError;
    }

    const assetError = validateUUID(assetId, "asset ID");
    if (assetError) {
      await logger.warn("Invalid asset ID format");
      return assetError;
    }

    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) return bodyResult.error;

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

    // Verify client exists and belongs to user
    const foundClient = await verifyClientOwnership(clientId, session.user.id);

    if (!foundClient) {
      await logger.info("Client not found", { statusCode: 404 });
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

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
          eq(asset.clientId, clientId),
          isNull(asset.deletedAt),
        ),
      )
      .returning();

    if (!updatedAsset) {
      await logger.info("Asset not found", { statusCode: 404 });
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    await logger.info("Asset updated successfully", { statusCode: 200 });
    return NextResponse.json({ asset: updatedAsset });
  } catch (error) {
    await logger.error(
      "Error updating asset",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/clients/[clientId]/assets/[assetId] - Soft delete an asset
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; assetId: string }> },
) {
  const { id: clientId, assetId } = await params;
  const logger = createLogger({
    endpoint: `/api/clients/${clientId}/assets/${assetId}`,
    method: "DELETE",
  });

  try {
    const sessionResult = await validateSession(logger);
    if ("error" in sessionResult) return sessionResult.error;
    const { session } = sessionResult;

    logger.addContext({
      userId: session.user.id,
      clientId,
      assetId,
    });

    // Validate UUID formats
    const clientError = validateUUID(clientId);
    if (clientError) {
      await logger.warn("Invalid client ID format");
      return clientError;
    }

    const assetError = validateUUID(assetId);
    if (assetError) {
      await logger.warn("Invalid asset ID format");
      return assetError;
    }

    // Verify client exists and belongs to user
    const foundClient = await verifyClientOwnership(clientId, session.user.id);

    if (!foundClient) {
      await logger.info("Client not found", { statusCode: 404 });
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
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
          eq(asset.clientId, clientId),
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

    await logger.info("Asset soft deleted successfully", { statusCode: 200 });
    return NextResponse.json({ message: "Asset deleted successfully" });
  } catch (error) {
    await logger.error(
      "Error deleting asset",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
