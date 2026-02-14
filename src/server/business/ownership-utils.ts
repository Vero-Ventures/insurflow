/**
 * Shareholder ownership validation utilities.
 *
 * Provides a reusable validator that enforces the ≤ 100% total ownership
 * invariant for a business's shareholders. Used by both the create and
 * update shareholder routes via the MutationHook injection point.
 *
 * @module ownership-utils
 */

import { business, shareholder } from "@/server/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { computeCurrentOwnership } from "@/lib/calculations/shareholder-analysis";
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
  // Acquire a row-level lock on the business row to serialise concurrent
  // shareholder mutations.  This prevents TOCTOU races where two requests
  // both read the current total, pass validation, and then both insert,
  // resulting in a total > 100%.  Only effective within a transaction.
  await db.execute(
    sql`SELECT id FROM ${business} WHERE id = ${businessId} FOR UPDATE`,
  );

  const existingShareholders = await db.query.shareholder.findMany({
    where: and(
      eq(shareholder.businessId, businessId),
      isNull(shareholder.deletedAt),
    ),
    columns: { id: true, ownershipPercentage: true },
  });

  const currentTotal = computeCurrentOwnership(
    existingShareholders,
    existingId,
  );
  const parsed =
    typeof newPercentage === "number"
      ? newPercentage
      : parseFloat(newPercentage) || 0;

  if (currentTotal + parsed > 100) {
    const contextLabel = existingId
      ? `Other shareholders total ${currentTotal}%`
      : `Current total is ${currentTotal}%`;

    await logger.warn("Total ownership percentage would exceed 100%", {
      currentTotal,
      newPercentage: parsed,
      wouldBeTotal: currentTotal + parsed,
    });

    return NextResponse.json(
      {
        error: "Validation failed",
        details: {
          ownershipPercentage: `Total ownership would be ${currentTotal + parsed}%, which exceeds 100%. ${contextLabel}.`,
        },
      },
      { status: 400 },
    );
  }

  return null;
}
