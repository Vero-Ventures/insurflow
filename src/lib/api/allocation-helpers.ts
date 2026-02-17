import { getDb } from "@/server/db";
import { assetAllocation, beneficiary } from "@/server/db/schemas";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { Logger } from "@/server/axiom";
import type { InferSelectModel } from "drizzle-orm";

type BeneficiaryRow = InferSelectModel<typeof beneficiary>;
type AssetAllocationRow = InferSelectModel<typeof assetAllocation>;

/**
 * Result type for beneficiary ownership verification
 */
export type BeneficiaryVerificationResult =
  | {
      success: true;
      beneficiary: BeneficiaryRow;
    }
  | {
      success: false;
      error: NextResponse;
    };

/**
 * Result type for allocation ownership verification
 */
export type AllocationVerificationResult =
  | {
      success: true;
      beneficiary: BeneficiaryRow;
      allocation: AssetAllocationRow;
    }
  | {
      success: false;
      error: NextResponse;
    };

/**
 * Verifies that a beneficiary belongs to a client.
 * Used by GET and POST handlers that only need beneficiary verification.
 *
 * @param params.clientId - The client ID to verify ownership against
 * @param params.beneficiaryId - The beneficiary ID to verify
 * @param params.logger - Logger instance for audit trail
 * @returns Either the found beneficiary or an error response
 */
export async function verifyBeneficiaryOwnership(params: {
  clientId: string;
  beneficiaryId: string;
  logger: Logger;
}): Promise<BeneficiaryVerificationResult> {
  const { clientId, beneficiaryId, logger } = params;
  const db = getDb();

  const foundBeneficiary = await db.query.beneficiary.findFirst({
    where: and(
      eq(beneficiary.id, beneficiaryId),
      eq(beneficiary.clientId, clientId),
      isNull(beneficiary.deletedAt),
    ),
  });

  if (!foundBeneficiary) {
    await logger.info("Beneficiary not found", { statusCode: 404 });
    return {
      success: false,
      error: NextResponse.json(
        { error: "Beneficiary not found" },
        { status: 404 },
      ),
    };
  }

  return {
    success: true,
    beneficiary: foundBeneficiary,
  };
}

/**
 * Verifies that a beneficiary belongs to a client and an allocation belongs to that beneficiary.
 * This helper consolidates the ownership verification logic used across allocation PATCH and DELETE handlers.
 *
 * @param params.clientId - The client ID to verify ownership against
 * @param params.beneficiaryId - The beneficiary ID to verify
 * @param params.allocationId - The allocation ID to verify
 * @param params.logger - Logger instance for audit trail
 * @returns Either the found entities or an error response
 */
export async function verifyAllocationOwnership(params: {
  clientId: string;
  beneficiaryId: string;
  allocationId: string;
  logger: Logger;
}): Promise<AllocationVerificationResult> {
  const { clientId, beneficiaryId, allocationId, logger } = params;

  // First verify beneficiary ownership
  const beneficiaryResult = await verifyBeneficiaryOwnership({
    clientId,
    beneficiaryId,
    logger,
  });

  if (!beneficiaryResult.success) {
    return beneficiaryResult;
  }

  // Then verify allocation belongs to this beneficiary
  const db = getDb();
  const existingAllocation = await db.query.assetAllocation.findFirst({
    where: and(
      eq(assetAllocation.id, allocationId),
      eq(assetAllocation.beneficiaryId, beneficiaryId),
    ),
  });

  if (!existingAllocation) {
    await logger.info("Allocation not found", { statusCode: 404 });
    return {
      success: false,
      error: NextResponse.json(
        { error: "Allocation not found" },
        { status: 404 },
      ),
    };
  }

  return {
    success: true,
    beneficiary: beneficiaryResult.beneficiary,
    allocation: existingAllocation,
  };
}
