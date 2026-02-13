import { getDb } from "@/server/db";
import { assetAllocation, beneficiary } from "@/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { updateAssetAllocationSchema } from "@/lib/validation/beneficiary";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";

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

    const db = getDb();

    // Verify beneficiary belongs to this client
    const foundBeneficiary = await db.query.beneficiary.findFirst({
      where: and(
        eq(beneficiary.id, beneficiaryId),
        eq(beneficiary.clientId, clientId!),
        isNull(beneficiary.deletedAt),
      ),
    });

    if (!foundBeneficiary) {
      await logger.info("Beneficiary not found", { statusCode: 404 });
      return NextResponse.json(
        { error: "Beneficiary not found" },
        { status: 404 },
      );
    }

    // Verify allocation belongs to this beneficiary
    const existingAllocation = await db.query.assetAllocation.findFirst({
      where: and(
        eq(assetAllocation.id, allocationId),
        eq(assetAllocation.beneficiaryId, beneficiaryId),
      ),
    });

    if (!existingAllocation) {
      await logger.info("Allocation not found", { statusCode: 404 });
      return NextResponse.json(
        { error: "Allocation not found" },
        { status: 404 },
      );
    }

    // Update the allocation
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

    const db = getDb();

    // Verify beneficiary belongs to this client
    const foundBeneficiary = await db.query.beneficiary.findFirst({
      where: and(
        eq(beneficiary.id, beneficiaryId),
        eq(beneficiary.clientId, clientId!),
        isNull(beneficiary.deletedAt),
      ),
    });

    if (!foundBeneficiary) {
      await logger.info("Beneficiary not found", { statusCode: 404 });
      return NextResponse.json(
        { error: "Beneficiary not found" },
        { status: 404 },
      );
    }

    // Verify allocation belongs to this beneficiary
    const existingAllocation = await db.query.assetAllocation.findFirst({
      where: and(
        eq(assetAllocation.id, allocationId),
        eq(assetAllocation.beneficiaryId, beneficiaryId),
      ),
    });

    if (!existingAllocation) {
      await logger.info("Allocation not found", { statusCode: 404 });
      return NextResponse.json(
        { error: "Allocation not found" },
        { status: 404 },
      );
    }

    // Hard delete the allocation
    await db
      .delete(assetAllocation)
      .where(eq(assetAllocation.id, allocationId));

    await logger.info("Allocation deleted successfully", { allocationId });

    return { data: { message: "Allocation deleted successfully" } };
  },
);
