import type {
  ShareholderAnalysisInput,
  ShareholderStake,
} from "@/types/shareholder";

/**
 * Builds a ShareholderAnalysisInput from raw business + shareholder data.
 *
 * This is the integration point between the CRUD layer and the
 * corporate shareholder analysis calculator (to be implemented later).
 *
 * @param business - The business entity with valuation
 * @param shareholders - Active (non-deleted) shareholders for the business
 * @returns Typed input ready for the corporate analysis calculator
 */
export function buildShareholderAnalysisInput(
  business: {
    id: string;
    name: string;
    valuation: string;
  },
  shareholders: {
    id: string;
    name: string;
    ownershipPercentage: string;
  }[],
): ShareholderAnalysisInput {
  const businessValuation = parseFloat(business.valuation) || 0;

  // Convert each shareholder's ownership to integer basis points first,
  // then derive the percentage from that to avoid IEEE-754 rounding issues
  // (e.g., 33.33 + 33.33 + 33.34 producing 99.99999… instead of 100).
  const stakes: ShareholderStake[] = shareholders.map((s) => {
    const bps = Math.round(Number(s.ownershipPercentage) * 100) || 0;
    const pct = bps / 100;
    return {
      id: s.id,
      name: s.name,
      ownershipPercentage: pct,
      stakeValue: (pct / 100) * businessValuation,
    };
  });

  // Sum in basis points (integers) then convert back once.
  const totalBps = stakes.reduce(
    (sum, s) => sum + Math.round(s.ownershipPercentage * 100),
    0,
  );

  return {
    businessId: business.id,
    businessName: business.name,
    businessValuation,
    shareholders: stakes,
    totalOwnership: totalBps / 100,
  };
}

/**
 * Computes the current total ownership in **basis points** (100ths of a percent)
 * for a business's shareholders, optionally excluding a specific shareholder.
 *
 * Using integer basis points avoids IEEE-754 floating-point rounding errors
 * (e.g., 33.33 + 33.33 + 33.34 !== 100 in float arithmetic).
 *
 * @param shareholders - Current active shareholders with IDs
 * @param excludeId - Shareholder ID to exclude (for update scenarios)
 * @returns The total ownership in basis points (10 000 = 100.00%)
 */
export function computeCurrentOwnershipBps(
  shareholders: { id: string; ownershipPercentage: string }[],
  excludeId?: string,
): number {
  return shareholders
    .filter((s) => s.id !== excludeId)
    .reduce(
      (sum, s) => sum + Math.round(Number(s.ownershipPercentage) * 100),
      0,
    );
}

/**
 * @deprecated Use {@link computeCurrentOwnershipBps} for precision-safe arithmetic.
 *
 * Computes the current total ownership percentage for a business's shareholders,
 * optionally excluding a specific shareholder (for update scenarios).
 *
 * Used by the create/update routes to enforce the ≤ 100% invariant.
 *
 * @param shareholders - Current active shareholders with IDs
 * @param excludeId - Shareholder ID to exclude (for update scenarios)
 * @returns The total ownership percentage of remaining shareholders
 */
export function computeCurrentOwnership(
  shareholders: { id: string; ownershipPercentage: string }[],
  excludeId?: string,
): number {
  return shareholders
    .filter((s) => s.id !== excludeId)
    .reduce((sum, s) => sum + (parseFloat(s.ownershipPercentage) || 0), 0);
}
