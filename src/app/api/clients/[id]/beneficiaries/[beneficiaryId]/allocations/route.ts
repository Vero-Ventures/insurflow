import { getDb } from "@/server/db";
import { assetAllocation, asset } from "@/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createAssetAllocationSchema } from "@/lib/validation/beneficiary";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";
import { verifyBeneficiaryOwnership } from "@/lib/api/allocation-helpers";

/**
 * GET /api/clients/[id]/beneficiaries/[beneficiaryId]/allocations
 * Get all asset allocations for a specific beneficiary
 */
export const GET = withApiHandler(
  {
    endpoint: "/api/clients/[id]/beneficiaries/[beneficiaryId]/allocations",
    method: "GET",
    requireClient: true,
    resourceIdParams: ["beneficiaryId"],
  },
  async (_request, { logger, clientId, resourceIds }) => {
    const beneficiaryId = resourceIds?.beneficiaryId;
    if (!beneficiaryId) {
      return NextResponse.json(
        { error: "Beneficiary ID is required" },
        { status: 400 },
      );
    }

    // Verify beneficiary belongs to this client
    const verificationResult = await verifyBeneficiaryOwnership({
      clientId: clientId!,
      beneficiaryId,
      logger,
    });

    if (!verificationResult.success) {
      return verificationResult.error;
    }

    // Fetch allocations with asset details
    const db = getDb();
    const allocations = await db.query.assetAllocation.findMany({
      where: eq(assetAllocation.beneficiaryId, beneficiaryId),
      with: {
        asset: true,
      },
    });

    await logger.info("Allocations fetched successfully", {
      allocationCount: allocations.length,
    });

    return { data: { items: allocations } };
  },
);

/**
 * POST /api/clients/[id]/beneficiaries/[beneficiaryId]/allocations
 * Create a new asset allocation for a beneficiary
 */
export const POST = withApiHandler(
  {
    endpoint: "/api/clients/[id]/beneficiaries/[beneficiaryId]/allocations",
    method: "POST",
    requireClient: true,
    resourceIdParams: ["beneficiaryId"],
  },
  async (request, { logger, clientId, resourceIds }) => {
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

    // Override beneficiaryId from URL
    const bodyWithBeneficiary = {
      ...(bodyResult.body as Record<string, unknown>),
      beneficiaryId,
    };

    // Validate request body
    const validationResult =
      createAssetAllocationSchema.safeParse(bodyWithBeneficiary);
    if (!validationResult.success) {
      return handleValidationError(logger, validationResult.error);
    }

    // Verify beneficiary belongs to this client
    const verificationResult = await verifyBeneficiaryOwnership({
      clientId: clientId!,
      beneficiaryId,
      logger,
    });

    if (!verificationResult.success) {
      return verificationResult.error;
    }

    const db = getDb();

    // Verify asset belongs to this client
    const foundAsset = await db.query.asset.findFirst({
      where: and(
        eq(asset.id, validationResult.data.assetId),
        eq(asset.clientId, clientId!),
        isNull(asset.deletedAt),
      ),
    });

    if (!foundAsset) {
      await logger.info("Asset not found", { statusCode: 404 });
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Check for existing allocation
    const existingAllocation = await db.query.assetAllocation.findFirst({
      where: and(
        eq(assetAllocation.beneficiaryId, beneficiaryId),
        eq(assetAllocation.assetId, validationResult.data.assetId),
      ),
    });

    if (existingAllocation) {
      await logger.warn("Allocation already exists", {
        existingId: existingAllocation.id,
      });
      return NextResponse.json(
        {
          error:
            "Allocation already exists for this beneficiary-asset pair. Use PATCH to update.",
        },
        { status: 409 },
      );
    }

    // Validate total allocation percentages do not exceed 100%
    const existingAllocations = await db.query.assetAllocation.findMany({
      where: eq(assetAllocation.assetId, validationResult.data.assetId),
    });

    const totalDesiredPercent = existingAllocations.reduce((sum, a) => {
      const percent = parseFloat(a.desiredPercent || "0");
      return sum + (isNaN(percent) ? 0 : percent);
    }, 0);

    const totalActualPercent = existingAllocations.reduce((sum, a) => {
      const percent = parseFloat(a.actualPercent || "0");
      return sum + (isNaN(percent) ? 0 : percent);
    }, 0);

    const newDesiredPercent = parseFloat(
      validationResult.data.desiredPercent || "0",
    );
    const newActualPercent = parseFloat(
      validationResult.data.actualPercent || "0",
    );

    if (totalDesiredPercent + newDesiredPercent > 100) {
      await logger.warn("Desired allocation exceeds 100%", {
        totalDesiredPercent,
        newDesiredPercent,
      });
      return NextResponse.json(
        { error: "Total desired allocation cannot exceed 100%" },
        { status: 400 },
      );
    }

    if (totalActualPercent + newActualPercent > 100) {
      await logger.warn("Actual allocation exceeds 100%", {
        totalActualPercent,
        newActualPercent,
      });
      return NextResponse.json(
        { error: "Total actual allocation cannot exceed 100%" },
        { status: 400 },
      );
    }

    // Create new allocation
    const [newAllocation] = await db
      .insert(assetAllocation)
      .values({
        beneficiaryId,
        assetId: validationResult.data.assetId,
        desiredPercent: validationResult.data.desiredPercent,
        actualPercent: validationResult.data.actualPercent,
        notes: validationResult.data.notes ?? null,
      })
      .returning();

    if (!newAllocation) {
      await logger.error("Failed to create allocation - no result returned");
      return NextResponse.json(
        { error: "Failed to create allocation" },
        { status: 500 },
      );
    }

    await logger.info("Allocation created successfully", {
      allocationId: newAllocation.id,
    });

    return { data: { allocation: newAllocation }, status: 201 };
  },
);
