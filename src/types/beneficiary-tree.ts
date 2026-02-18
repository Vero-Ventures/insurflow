import type { Client } from "./client";
import type { Asset } from "./asset";
import type { Beneficiary } from "./beneficiary";

/**
 * Node types in the family tree
 */
export type TreeNodeType =
  | "client"
  | "spouse"
  | "child"
  | "beneficiary"
  | "asset";

/**
 * Visual coverage gap indicator
 */
export interface CoverageGapIndicator {
  hasGap: boolean;
  severity: "none" | "minor" | "major";
  message: string;
}

/**
 * Tree node representing a person or asset
 */
export interface TreeNode {
  id: string;
  type: TreeNodeType;
  label: string;
  sublabel?: string;
  // Visual properties
  x: number;
  y: number;
  width: number;
  height: number;
  // Coverage information
  coverageGap?: CoverageGapIndicator;
  // Asset-specific
  assetValue?: number;
  assetType?: string;
  // Relationships
  children: TreeNode[];
  // Original entity reference
  entity: Client | Beneficiary | Asset;
}

/**
 * Edge connecting nodes (asset flow)
 */
export interface TreeEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  // Visual properties
  points: { x: number; y: number }[];
  // Allocation information
  percentage?: number;
  amount?: number;
  // Gap indicator
  hasGap: boolean;
}

/**
 * Complete tree structure
 */
export interface BeneficiaryTree {
  nodes: TreeNode[];
  edges: TreeEdge[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}
