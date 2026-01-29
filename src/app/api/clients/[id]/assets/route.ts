import { getDb } from "@/server/db";
import { asset } from "@/server/db/schema";
import { createLogger } from "@/server/axiom";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createAssetSchema } from "@/lib/validation/asset";
import { validateUUID, verifyClientOwnership } from "@/lib/api/client-helpers";
import {
  validateSession,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";

/**
 * GET /api/clients/[id]/assets - Get all assets for a client
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const logger = createLogger({
    endpoint: `/api/clients/${id}/assets`,
    method: "GET",
  });

  try {
    const sessionResult = await validateSession(logger);
    if ("error" in sessionResult) return sessionResult.error;
    const { session } = sessionResult;

    logger.addContext({ userId: session.user.id, clientId: id });

    // Validate UUID format
    const uuidError = validateUUID(id, "client ID");
    if (uuidError) {
      await logger.warn("Invalid UUID format");
      return uuidError;
    }

    const db = getDb();

    // Verify client exists and belongs to user
    const foundClient = await verifyClientOwnership(id, session.user.id);

    if (!foundClient) {
      await logger.info("Client not found", { statusCode: 404 });
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Fetch all non-deleted assets for the client
    const assets = await db.query.asset.findMany({
      where: and(eq(asset.clientId, id), isNull(asset.deletedAt)),
    });

    await logger.info("Assets fetched successfully", {
      statusCode: 200,
      assetCount: assets.length,
    });

    return NextResponse.json({ assets });
  } catch (error) {
    await logger.error(
      "Error fetching assets",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/clients/[id]/assets - Create a new asset for a client
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const logger = createLogger({
    endpoint: `/api/clients/${id}/assets`,
    method: "POST",
  });

  try {
    const sessionResult = await validateSession(logger);
    if ("error" in sessionResult) return sessionResult.error;
    const { session } = sessionResult;

    logger.addContext({ userId: session.user.id, clientId: id });

    // Validate UUID format
    const uuidError = validateUUID(id, "client ID");
    if (uuidError) {
      await logger.warn("Invalid UUID format");
      return uuidError;
    }

    // Verify client exists and belongs to user
    const foundClient = await verifyClientOwnership(id, session.user.id);

    if (!foundClient) {
      await logger.info("Client not found", { statusCode: 404 });
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) return bodyResult.error;

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
        clientId: id,
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
      statusCode: 201,
      assetId: newAsset.id,
    });

    return NextResponse.json({ asset: newAsset }, { status: 201 });
  } catch (error) {
    await logger.error(
      "Error creating asset",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
