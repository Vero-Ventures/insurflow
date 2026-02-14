/**
 * Shareholder ownership validation utilities.
 *
 * Provides a reusable validator that enforces the ≤ 100% total ownership
 * invariant for a business's shareholders. Used by both the create and
 * update shareholder routes via the MutationHook injection point.
 *
 * @module ownership-utils
 */

import { shareholder } from "@/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { computeCurrentOwnershipBps } from "@/lib/calculations/shareholder-analysis";
import type { getDb } from "@/server/db";
import type { Logger } from "@/server/axiom";

/**
 * Validates that adding or updating a shareholder's ownership percentage
 * will not cause the business's total ownership to exceed 100%.
 *
 * @param db - Drizzle database instance
 * @param businessId - Business to check against
 * @param newPercentage - The proposed ownership percentage (as string or number)
 * @param logger - Logger for structured warnings
 * @param existingId - Shareholder ID to exclude from the total (for updates)
 * @returns `NextResponse` with 400 error if validation fails, `null` if OK
 */
export async function validateShareholderOwnershipTotal(
  db: ReturnType<typeof getDb>,
  businessId: string,
  newPercentage: string | number,
  logger: Logger,
  existingId?: string,
): Promise<NextResponse | null> {
  const existingShareholders = await db.query.shareholder.findMany({
    where: and(
      eq(shareholder.businessId, businessId),
      isNull(shareholder.deletedAt),
    ),
    columns: { id: true, ownershipPercentage: true },
  });

  const currentTotalBps = computeCurrentOwnershipBps(
    existingShareholders,
    existingId,
  );
  const newBps = Math.round(Number(newPercentage) * 100) || 0;
  const wouldBeTotalBps = currentTotalBps + newBps;

  if (wouldBeTotalBps > 10_000) {
    const currentPct = (currentTotalBps / 100).toFixed(2);
    const wouldBePct = (wouldBeTotalBps / 100).toFixed(2);
    const contextLabel = existingId
      ? `Other shareholders total ${currentPct}%`
      : `Current total is ${currentPct}%`;

    await logger.warn("Total ownership percentage would exceed 100%", {
      currentTotal: currentPct,
      newPercentage: (newBps / 100).toFixed(2),
      wouldBeTotal: wouldBePct,
    });

    return NextResponse.json(
      {
        error: "Validation failed",
        details: {
          ownershipPercentage: `Total ownership would be ${wouldBePct}%, which exceeds 100%. ${contextLabel}.`,
        },
      },
      { status: 400 },
    );
  }

  return null;
}
