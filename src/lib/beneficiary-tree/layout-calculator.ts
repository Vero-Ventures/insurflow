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
  nodeWidth: 120,
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
  let currentY = 50; // Start with padding
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
    const rowWidth =
      Math.min(assetsPerRow, assetNodes.length - row * assetsPerRow) *
        (cfg.nodeWidth + cfg.horizontalSpacing) -
      cfg.horizontalSpacing;
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

  // Calculate edge paths (curved lines)
  const layoutEdges = edges.map((edge) => {
    const sourceNode = layoutNodes.find((n) => n.id === edge.source);
    const targetNode = layoutNodes.find((n) => n.id === edge.target);

    if (!sourceNode || !targetNode) {
      return { ...edge, points: [] };
    }

    // Calculate bezier curve path
    const sourceX = sourceNode.x + sourceNode.width / 2;
    const sourceY = sourceNode.y + sourceNode.height;
    const targetX = targetNode.x + targetNode.width / 2;
    const targetY = targetNode.y;

    const controlPointY = sourceY + (targetY - sourceY) / 2;

    return {
      ...edge,
      points: [
        { x: sourceX, y: sourceY },
        { x: sourceX, y: controlPointY },
        { x: targetX, y: controlPointY },
        { x: targetX, y: targetY },
      ],
    };
  });

  // Calculate bounds with padding
  const PADDING = 100;
  const allX = layoutNodes.map((n) => [n.x, n.x + n.width]).flat();
  const allY = layoutNodes.map((n) => [n.y, n.y + n.height]).flat();

  const bounds = {
    minX: Math.min(...allX) - PADDING,
    maxX: Math.max(...allX) + PADDING,
    minY: Math.min(...allY) - PADDING,
    maxY: Math.max(...allY) + PADDING,
  };

  return {
    nodes: layoutNodes,
    edges: layoutEdges,
    bounds,
  };
}
