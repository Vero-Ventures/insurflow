export type BeneficiaryRelationship =
  | "spouse"
  | "child"
  | "parent"
  | "sibling"
  | "grandchild"
  | "grandparent"
  | "trust"
  | "charity"
  | "estate"
  | "business_partner"
  | "other";

export interface Beneficiary {
  id: string;
  clientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  relationship: BeneficiaryRelationship;
  isPrimary: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  [key: string]: unknown; // Support generic index signature for CrudItem
}

export interface AssetAllocation {
  id: string;
  beneficiaryId: string;
  assetId: string;
  desiredPercent: string;
  actualPercent: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

/**
 * Asset allocation with expanded beneficiary info for display
 */
export interface AssetAllocationWithBeneficiary extends AssetAllocation {
  beneficiary: {
    id: string;
    firstName: string;
    lastName: string;
    relationship: BeneficiaryRelationship;
  };
}

/**
 * Asset allocation with expanded asset info for display
 */
export interface AssetAllocationWithAsset extends AssetAllocation {
  asset: {
    id: string;
    name: string;
    type: string;
    currentValue: string;
  };
}

/**
 * Gap analysis result for a single asset
 */
export interface AssetGapAnalysis {
  assetId: string;
  assetName: string;
  assetType: string;
  assetValue: number;
  totalDesiredPercent: number;
  totalActualPercent: number;
  hasGap: boolean;
  gapPercent: number;
  allocations: Array<{
    beneficiaryId: string;
    beneficiaryName: string;
    relationship: BeneficiaryRelationship;
    desiredPercent: number;
    actualPercent: number;
    gapPercent: number;
  }>;
}

/**
 * Overall gap analysis summary for a client
 */
export interface GapAnalysisSummary {
  totalAssets: number;
  assetsWithGaps: number;
  assetsWithoutGaps: number;
  unallocatedAssets: number;
  overAllocatedAssets: number;
  assetAnalysis: AssetGapAnalysis[];
}
