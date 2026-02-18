import type {
  TreeNode,
  TreeEdge,
  BeneficiaryTree,
} from "@/types/beneficiary-tree";

interface LayoutConfig {
  horizontalSpacing: number;
  verticalSpacing: number;
  nodeWidth: number;
  nodeHeight: number;
}

const DEFAULT_CONFIG: LayoutConfig = {
  horizontalSpacing: 200,
  verticalSpacing: 150,
  nodeWidth: 160,
  nodeHeight: 80,
};

/**
 * Calculate hierarchical tree layout
 * Layout strategy: Top to bottom (Client/Spouse → Assets → Beneficiaries)
 */
export function calculateTreeLayout(
  nodes: TreeNode[],
  edges: TreeEdge[],
  config: Partial<LayoutConfig> = {},
): BeneficiaryTree {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Separate nodes by level
  const clientNodes = nodes.filter((n) => n.type === "client");
  const spouseNodes = nodes.filter((n) => n.type === "spouse");
  const beneficiaryNodes = nodes.filter(
    (n) => n.type === "child" || n.type === "beneficiary",
  );
  const assetNodes = nodes.filter((n) => n.type === "asset");

  const layoutNodes: TreeNode[] = [];

  // Level 0: Client & Spouse (top center)
  let currentY = 50;
  const familyNodes = [...clientNodes, ...spouseNodes];
  const familyWidth =
    familyNodes.length * cfg.nodeWidth +
    (familyNodes.length - 1) * (cfg.horizontalSpacing / 2);
  const familyStartX = -familyWidth / 2;

  familyNodes.forEach((node, i) => {
    layoutNodes.push({
      ...node,
      x: familyStartX + i * (cfg.nodeWidth + cfg.horizontalSpacing / 2),
      y: currentY,
    });
  });

  // Level 1: Assets (middle, grid layout)
  currentY += cfg.nodeHeight + cfg.verticalSpacing;
  const assetsPerRow = Math.ceil(Math.sqrt(assetNodes.length));
  const assetRowCount = Math.ceil(assetNodes.length / assetsPerRow);

  assetNodes.forEach((node, i) => {
    const row = Math.floor(i / assetsPerRow);
    const col = i % assetsPerRow;
    const nodesInRow = Math.min(
      assetsPerRow,
      assetNodes.length - row * assetsPerRow,
    );
    const rowWidth =
      nodesInRow * cfg.nodeWidth + (nodesInRow - 1) * cfg.horizontalSpacing;
    const rowStartX = -rowWidth / 2;

    layoutNodes.push({
      ...node,
      x: rowStartX + col * (cfg.nodeWidth + cfg.horizontalSpacing),
      y: currentY + row * (cfg.nodeHeight + cfg.verticalSpacing / 2),
    });
  });

  // Level 2: Beneficiaries (bottom, evenly distributed)
  currentY +=
    assetRowCount * cfg.nodeHeight +
    (assetRowCount - 1) * (cfg.verticalSpacing / 2) +
    cfg.verticalSpacing;
  const beneficiaryWidth =
    beneficiaryNodes.length * cfg.nodeWidth +
    (beneficiaryNodes.length - 1) * cfg.horizontalSpacing;
  const beneficiaryStartX = -beneficiaryWidth / 2;

  beneficiaryNodes.forEach((node, i) => {
    layoutNodes.push({
      ...node,
      x: beneficiaryStartX + i * (cfg.nodeWidth + cfg.horizontalSpacing),
      y: currentY,
    });
  });

  // --- Normalize: shift all nodes so min x/y is PADDING ---
  const PADDING = 50;
  const rawMinX = Math.min(...layoutNodes.map((n) => n.x));
  const rawMinY = Math.min(...layoutNodes.map((n) => n.y));
  const offsetX = -rawMinX + PADDING;
  const offsetY = -rawMinY + PADDING;

  for (const node of layoutNodes) {
    node.x += offsetX;
    node.y += offsetY;
  }

  // Build a Map for O(1) node lookups by ID
  const nodeMap = new Map(layoutNodes.map((node) => [node.id, node]));

  // Calculate edge paths AFTER normalization
  const layoutEdges = edges.map((edge) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    if (!sourceNode || !targetNode) {
      return { ...edge, points: [] };
    }

    const sourceX = sourceNode.x + sourceNode.width / 2;
    const sourceY = sourceNode.y + sourceNode.height;
    const targetX = targetNode.x + targetNode.width / 2;
    const targetY = targetNode.y;

    // Use two control points for a smooth cubic bezier
    const midY = sourceY + (targetY - sourceY) / 2;

    return {
      ...edge,
      points: [
        { x: sourceX, y: sourceY },
        { x: sourceX, y: midY },
        { x: targetX, y: midY },
        { x: targetX, y: targetY },
      ],
    };
  });

  // Calculate bounds
  const allX = layoutNodes.map((n) => [n.x, n.x + n.width]).flat();
  const allY = layoutNodes.map((n) => [n.y, n.y + n.height]).flat();

  const bounds = {
    minX: 0,
    maxX: Math.max(...allX) + PADDING,
    minY: 0,
    maxY: Math.max(...allY) + PADDING,
  };

  return {
    nodes: layoutNodes,
    edges: layoutEdges,
    bounds,
  };
}
