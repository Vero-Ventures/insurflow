import { getDb } from "@/server/db";
import { asset } from "@/server/db/schemas";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createAssetSchema } from "@/lib/validation/asset";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";

/**
 * GET /api/clients/[id]/assets - Get all assets for a client
 */
export const GET = withApiHandler(
  { endpoint: "/api/clients/[id]/assets", method: "GET", requireClient: true },
  async (_request, { logger, clientId }) => {
    const db = getDb();

    // Fetch all non-deleted assets for the client
    const assets = await db.query.asset.findMany({
      where: and(eq(asset.clientId, clientId!), isNull(asset.deletedAt)),
    });

    await logger.info("Assets fetched successfully", {
      assetCount: assets.length,
    });

    return { data: { items: assets } };
  },
);

/**
 * POST /api/clients/[id]/assets - Create a new asset for a client
 */
export const POST = withApiHandler(
  { endpoint: "/api/clients/[id]/assets", method: "POST", requireClient: true },
  async (request, { logger, clientId }) => {
    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) {
      return bodyResult.error;
    }

    // Validate request body
    const validationResult = createAssetSchema.safeParse(bodyResult.body);
    if (!validationResult.success) {
      return handleValidationError(logger, validationResult.error);
    }

    const db = getDb();

    // Create new asset
    const [newAsset] = await db
      .insert(asset)
      .values({
        clientId: clientId!,
        name: validationResult.data.name,
        type: validationResult.data.type,
        currentValue: validationResult.data.currentValue,
        isLiquid: validationResult.data.isLiquid,
      })
      .returning();

    if (!newAsset) {
      await logger.error("Failed to create asset - no result returned");
      return NextResponse.json(
        { error: "Failed to create asset" },
        { status: 500 },
      );
    }

    await logger.info("Asset created successfully", {
      assetId: newAsset.id,
    });

    return { data: { items: [newAsset] }, status: 201 };
  },
);
