export interface Shareholder {
  id: string;
  businessId: string;
  name: string;
  ownershipPercentage: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  [key: string]: unknown;
}

/**
 * Typed shape for the corporate shareholder analysis calculator.
 *
 * Provides a clean representation of a business's shareholders
 * with ownership stakes and computed metadata for downstream
 * analysis (e.g., buy-sell agreements, EBITDA contribution).
 */
export interface ShareholderAnalysisInput {
  /** Business valuation */
  businessValuation: number;
  /** Business name */
  businessName: string;
  /** Business ID */
  businessId: string;
  /** All active shareholders with parsed numeric ownership */
  shareholders: ShareholderStake[];
  /** Sum of all shareholder ownership percentages */
  totalOwnership: number;
}

export interface ShareholderStake {
  id: string;
  name: string;
  /** Ownership percentage as a number (0–100) */
  ownershipPercentage: number;
  /** Computed dollar value of the stake based on business valuation */
  stakeValue: number;
}
