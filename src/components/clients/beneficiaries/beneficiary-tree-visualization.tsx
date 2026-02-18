"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { BeneficiaryTreeNode } from "./beneficiary-tree-node";
import { BeneficiaryTreeControls } from "./beneficiary-tree-controls";
import { useBeneficiaryTreeLayout } from "./use-beneficiary-tree-layout";
import type { Client } from "@/types/client";
import type { Asset } from "@/types/asset";
import type { Beneficiary, GapAnalysisSummary } from "@/types/beneficiary";
import { formatCurrency } from "@/lib/client-utils";
import { Maximize2 } from "lucide-react";

interface BeneficiaryTreeVisualizationProps {
  client: Client;
  beneficiaries: Beneficiary[];
  assets: Asset[];
  gapAnalysis?: GapAnalysisSummary;
}

export function BeneficiaryTreeVisualization({
  client,
  beneficiaries,
  assets,
  gapAnalysis,
}: BeneficiaryTreeVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const tree = useBeneficiaryTreeLayout({
    client,
    beneficiaries,
    assets,
    gapAnalysis,
  });

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.25, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.25, 0.25));
  }, []);

  const handleFitView = useCallback(() => {
    if (!tree || !containerRef.current) return;

    const container = containerRef.current;
    const { bounds } = tree;

    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;

    const scaleX = container.clientWidth / width;
    const scaleY = container.clientHeight / height;
    const newZoom = Math.min(scaleX, scaleY, 1);

    setZoom(newZoom);
    setPan({
      x: (container.clientWidth - width * newZoom) / 2 - bounds.minX * newZoom,
      y:
        (container.clientHeight - height * newZoom) / 2 - bounds.minY * newZoom,
    });
  }, [tree]);

  // Auto-fit on initial load
  useEffect(() => {
    if (tree) {
      handleFitView();
    }
  }, [tree, handleFitView]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;

      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;

      setPan((prev) => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));

      setLastMousePos({ x: e.clientX, y: e.clientY });
    },
    [isPanning, lastMousePos],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  if (!tree) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Maximize2 className="h-5 w-5" />
            Estate Flow Visualization
          </CardTitle>
          <CardDescription>
            Interactive family tree and asset distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 flex h-[400px] items-center justify-center rounded-xl border">
            <p className="text-muted-foreground text-center">
              Add beneficiaries and assets to see the estate flow visualization
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Maximize2 className="h-5 w-5" />
          Estate Flow Visualization
        </CardTitle>
        <CardDescription>
          Interactive family tree showing asset distribution to beneficiaries
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          className="relative h-[600px] overflow-hidden rounded-xl border bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isPanning ? "grabbing" : "grab" }}
        >
          {/* SVG for edges */}
          <svg
            className="pointer-events-none absolute inset-0"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
            }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3, 0 6"
                  className="fill-slate-400 dark:fill-slate-600"
                />
              </marker>
              <marker
                id="arrowhead-gap"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" className="fill-amber-500" />
              </marker>
            </defs>
            {tree.edges.map((edge) => (
              <g key={edge.id}>
                <path
                  d={`M ${edge.points.map((p) => `${p.x},${p.y}`).join(" L ")}`}
                  stroke={edge.hasGap ? "#f59e0b" : "#94a3b8"}
                  strokeWidth="2"
                  fill="none"
                  markerEnd={
                    edge.hasGap ? "url(#arrowhead-gap)" : "url(#arrowhead)"
                  }
                  strokeDasharray={edge.hasGap ? "5,5" : undefined}
                />
                {edge.label && edge.points.length >= 2 && (
                  <text
                    x={edge.points[1]?.x ?? 0}
                    y={(edge.points[1]?.y ?? 0) - 10}
                    className="fill-slate-700 text-xs font-medium dark:fill-slate-300"
                    textAnchor="middle"
                  >
                    {edge.label}
                    {edge.amount && ` (${formatCurrency(edge.amount)})`}
                  </text>
                )}
              </g>
            ))}
          </svg>

          {/* Nodes */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
            }}
          >
            {tree.nodes.map((node) => (
              <BeneficiaryTreeNode
                key={node.id}
                node={node}
                onClick={() => setSelectedNode(node.id)}
                isSelected={selectedNode === node.id}
              />
            ))}
          </div>

          {/* Controls */}
          <BeneficiaryTreeControls
            zoom={zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFitView={handleFitView}
          />
        </div>
      </CardContent>
    </Card>
  );
}
