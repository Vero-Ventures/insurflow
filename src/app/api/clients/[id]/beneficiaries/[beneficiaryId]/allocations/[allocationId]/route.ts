import { getDb } from "@/server/db";
import { assetAllocation } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { updateAssetAllocationSchema } from "@/lib/validation/beneficiary";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";
import { verifyAllocationOwnership } from "@/lib/api/allocation-helpers";

/**
 * PATCH /api/clients/[id]/beneficiaries/[beneficiaryId]/allocations/[allocationId]
 * Update an asset allocation
 */
export const PATCH = withApiHandler(
  {
    endpoint:
      "/api/clients/[id]/beneficiaries/[beneficiaryId]/allocations/[allocationId]",
    method: "PATCH",
    requireClient: true,
    resourceIdParams: ["beneficiaryId", "allocationId"],
  },
  async (request, { logger, clientId, resourceIds }) => {
    const beneficiaryId = resourceIds?.beneficiaryId;
    const allocationId = resourceIds?.allocationId;

    if (!beneficiaryId || !allocationId) {
      return NextResponse.json(
        { error: "Beneficiary ID and Allocation ID are required" },
        { status: 400 },
      );
    }

    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) {
      return bodyResult.error;
    }

    // Validate request body
    const validationResult = updateAssetAllocationSchema.safeParse(
      bodyResult.body,
    );
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

    // Verify ownership chain: client -> beneficiary -> allocation
    const verificationResult = await verifyAllocationOwnership({
      clientId: clientId!,
      beneficiaryId,
      allocationId,
      logger,
    });

    if (!verificationResult.success) {
      return verificationResult.error;
    }

    // Update the allocation
    const db = getDb();
    const [updatedAllocation] = await db
      .update(assetAllocation)
      .set({
        ...validationResult.data,
        updatedAt: new Date(),
      })
      .where(eq(assetAllocation.id, allocationId))
      .returning();

    await logger.info("Allocation updated successfully", {
      allocationId: updatedAllocation?.id,
    });

    return { data: { allocation: updatedAllocation } };
  },
);

/**
 * DELETE /api/clients/[id]/beneficiaries/[beneficiaryId]/allocations/[allocationId]
 * Delete an asset allocation (hard delete since it's a junction table)
 */
export const DELETE = withApiHandler(
  {
    endpoint:
      "/api/clients/[id]/beneficiaries/[beneficiaryId]/allocations/[allocationId]",
    method: "DELETE",
    requireClient: true,
    resourceIdParams: ["beneficiaryId", "allocationId"],
  },
  async (_request, { logger, clientId, resourceIds }) => {
    const beneficiaryId = resourceIds?.beneficiaryId;
    const allocationId = resourceIds?.allocationId;

    if (!beneficiaryId || !allocationId) {
      return NextResponse.json(
        { error: "Beneficiary ID and Allocation ID are required" },
        { status: 400 },
      );
    }

    // Verify ownership chain: client -> beneficiary -> allocation
    const verificationResult = await verifyAllocationOwnership({
      clientId: clientId!,
      beneficiaryId,
      allocationId,
      logger,
    });

    if (!verificationResult.success) {
      return verificationResult.error;
    }

    // Hard delete the allocation
    const db = getDb();
    await db
      .delete(assetAllocation)
      .where(eq(assetAllocation.id, allocationId));

    await logger.info("Allocation deleted successfully", { allocationId });

    return { data: { message: "Allocation deleted successfully" } };
  },
);
