import type { Client } from "@/types/client";
import type { Asset } from "@/types/asset";
import type { Beneficiary } from "@/types/beneficiary";
import type { TreeNode, TreeEdge } from "@/types/beneficiary-tree";

interface BuildTreeInput {
  client: Client;
  beneficiaries: Beneficiary[];
  assets: Asset[];
  gapAnalysis?: {
    assetAnalysis: Array<{
      assetId: string;
      hasGap: boolean;
      allocations: Array<{
        beneficiaryId: string;
        actualPercent: number;
        gapPercent: number;
      }>;
    }>;
  };
}

/**
 * Build tree structure from client data
 */
export function buildBeneficiaryTree(input: BuildTreeInput): {
  nodes: TreeNode[];
  edges: TreeEdge[];
} {
  const { client, beneficiaries, assets, gapAnalysis } = input;
  const nodes: TreeNode[] = [];
  const edges: TreeEdge[] = [];

  // 1. Create client node (root)
  const clientNode: TreeNode = {
    id: `client-${client.id}`,
    type: "client",
    label: `${client.firstName} ${client.lastName}`,
    sublabel: "Client",
    x: 0,
    y: 0,
    width: 160,
    height: 80,
    children: [],
    entity: client,
  };
  nodes.push(clientNode);

  // 2. Create spouse node if exists
  if (client.hasSpouse) {
    const spouseNode: TreeNode = {
      id: `spouse-${client.id}`,
      type: "spouse",
      label: "Spouse",
      sublabel: client.spouseAge ? `Age ${client.spouseAge}` : undefined,
      x: 0,
      y: 0,
      width: 160,
      height: 80,
      children: [],
      entity: client,
    };
    nodes.push(spouseNode);
  }

  // 3. Create beneficiary nodes
  const beneficiaryNodes = beneficiaries.map((ben) => {
    const node: TreeNode = {
      id: `beneficiary-${ben.id}`,
      type: ben.relationship === "child" ? "child" : "beneficiary",
      label: `${ben.firstName} ${ben.lastName}`,
      sublabel: ben.relationship,
      x: 0,
      y: 0,
      width: 160,
      height: 80,
      children: [],
      entity: ben,
    };
    return node;
  });
  nodes.push(...beneficiaryNodes);

  // 4. Create asset nodes
  const assetNodes = assets.map((asset) => {
    const gapInfo = gapAnalysis?.assetAnalysis.find(
      (a) => a.assetId === asset.id,
    );
    const hasAllocations = gapInfo && gapInfo.allocations.length > 0;
    const node: TreeNode = {
      id: `asset-${asset.id}`,
      type: "asset",
      label: asset.name,
      sublabel: asset.type,
      assetValue: Number(asset.currentValue),
      assetType: asset.type,
      x: 0,
      y: 0,
      width: 160,
      height: 80,
      children: [],
      entity: asset,
      coverageGap: !hasAllocations
        ? {
            hasGap: true,
            severity: "major",
            message: "No beneficiary allocations",
          }
        : gapInfo?.hasGap
          ? {
              hasGap: true,
              severity: "major",
              message: "Allocation mismatch",
            }
          : {
              hasGap: false,
              severity: "none",
              message: "Properly allocated",
            },
    };
    return node;
  });
  nodes.push(...assetNodes);

  // 5. Create edges: client → each asset (ownership flow)
  assets.forEach((asset) => {
    edges.push({
      id: `edge-owner-${client.id}-${asset.id}`,
      source: `client-${client.id}`,
      target: `asset-${asset.id}`,
      label: "Owns",
      points: [], // Calculated during layout
      hasGap: false,
    });
  });

  // 6. Create edges: asset → beneficiaries (allocation flows)
  assets.forEach((asset) => {
    const gapInfo = gapAnalysis?.assetAnalysis.find(
      (a) => a.assetId === asset.id,
    );

    if (gapInfo && gapInfo.allocations.length > 0) {
      // Has specific allocations — draw edge per allocation
      gapInfo.allocations.forEach((alloc) => {
        edges.push({
          id: `edge-alloc-${asset.id}-${alloc.beneficiaryId}`,
          source: `asset-${asset.id}`,
          target: `beneficiary-${alloc.beneficiaryId}`,
          label: `${alloc.actualPercent}%`,
          percentage: alloc.actualPercent,
          points: [],
          hasGap: alloc.gapPercent !== 0,
        });
      });
    } else {
      // No allocations — draw dashed edge to every beneficiary
      beneficiaries.forEach((ben) => {
        edges.push({
          id: `edge-unalloc-${asset.id}-${ben.id}`,
          source: `asset-${asset.id}`,
          target: `beneficiary-${ben.id}`,
          label: "Unallocated",
          points: [],
          hasGap: true,
        });
      });
    }
  });

  return { nodes, edges };
}
