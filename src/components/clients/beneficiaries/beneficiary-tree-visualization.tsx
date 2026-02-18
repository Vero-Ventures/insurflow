"use client";

import { useRef, useState, useCallback, useEffect, useId } from "react";
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

  // Unique IDs for SVG markers to avoid duplicate HTML IDs
  const uniqueId = useId();
  const arrowheadId = `arrowhead-${uniqueId}`;
  const arrowheadGapId = `arrowhead-gap-${uniqueId}`;

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

    const treeWidth = bounds.maxX;
    const treeHeight = bounds.maxY;

    if (treeWidth === 0 || treeHeight === 0) return;

    const scaleX = container.clientWidth / treeWidth;
    const scaleY = container.clientHeight / treeHeight;
    const newZoom = Math.min(scaleX, scaleY, 1) * 0.9; // 90% to add breathing room

    setZoom(newZoom);
    setPan({
      x: (container.clientWidth - treeWidth * newZoom) / 2,
      y: (container.clientHeight - treeHeight * newZoom) / 2,
    });
  }, [tree]);

  // Auto-fit on initial load and when tree changes
  useEffect(() => {
    if (tree) {
      // Small delay so container dimensions are available
      requestAnimationFrame(() => handleFitView());
    }
  }, [tree, handleFitView]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start pan on the container background, not on nodes
    if (e.target === e.currentTarget || e.target instanceof SVGElement) {
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
      e.preventDefault();
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

  // Handle scroll-to-zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.min(Math.max(prev + delta, 0.25), 2));
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

  // Build SVG path string using cubic bezier
  function buildEdgePath(points: { x: number; y: number }[]): string {
    if (points.length < 4) return "";
    const [start, cp1, cp2, end] = points;
    if (!start || !cp1 || !cp2 || !end) return "";
    return `M ${start.x},${start.y} C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${end.x},${end.y}`;
  }

  // Label position: midpoint of the bezier
  function edgeLabelPos(points: { x: number; y: number }[]): {
    x: number;
    y: number;
  } {
    if (points.length < 4) return { x: 0, y: 0 };
    const [p0, p1, p2, p3] = points;
    if (!p0 || !p1 || !p2 || !p3) return { x: 0, y: 0 };
    // Approximate midpoint of cubic bezier at t=0.5
    const t = 0.5;
    const x =
      (1 - t) ** 3 * p0.x +
      3 * (1 - t) ** 2 * t * p1.x +
      3 * (1 - t) * t ** 2 * p2.x +
      t ** 3 * p3.x;
    const y =
      (1 - t) ** 3 * p0.y +
      3 * (1 - t) ** 2 * t * p1.y +
      3 * (1 - t) * t ** 2 * p2.y +
      t ** 3 * p3.y;
    return { x, y };
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
          onWheel={handleWheel}
          style={{ cursor: isPanning ? "grabbing" : "grab" }}
        >
          {/* Single transform wrapper for both SVG and nodes */}
          <div
            className="absolute origin-top-left"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              width: tree.bounds.maxX,
              height: tree.bounds.maxY,
            }}
          >
            {/* SVG edges layer */}
            <svg
              className="pointer-events-none absolute top-0 left-0"
              width={tree.bounds.maxX}
              height={tree.bounds.maxY}
              style={{ overflow: "visible" }}
            >
              <defs>
                <marker
                  id={arrowheadId}
                  markerWidth="10"
                  markerHeight="8"
                  refX="10"
                  refY="4"
                  orient="auto"
                >
                  <polygon points="0 0, 10 4, 0 8" fill="#94a3b8" />
                </marker>
                <marker
                  id={arrowheadGapId}
                  markerWidth="10"
                  markerHeight="8"
                  refX="10"
                  refY="4"
                  orient="auto"
                >
                  <polygon points="0 0, 10 4, 0 8" fill="#f59e0b" />
                </marker>
              </defs>
              {tree.edges.map((edge) => {
                if (edge.points.length < 4) return null;
                const pathD = buildEdgePath(edge.points);
                const labelPos = edgeLabelPos(edge.points);

                return (
                  <g key={edge.id}>
                    <path
                      d={pathD}
                      stroke={edge.hasGap ? "#f59e0b" : "#94a3b8"}
                      strokeWidth="2"
                      fill="none"
                      markerEnd={
                        edge.hasGap
                          ? `url(#${arrowheadGapId})`
                          : `url(#${arrowheadId})`
                      }
                      strokeDasharray={edge.hasGap ? "6,4" : undefined}
                    />
                    {edge.label && (
                      <g>
                        <rect
                          x={labelPos.x - 30}
                          y={labelPos.y - 12}
                          width={60}
                          height={20}
                          rx={4}
                          fill="white"
                          fillOpacity={0.85}
                          className="dark:fill-slate-900"
                        />
                        <text
                          x={labelPos.x}
                          y={labelPos.y + 2}
                          textAnchor="middle"
                          fontSize={11}
                          fontWeight={500}
                          fill={edge.hasGap ? "#d97706" : "#64748b"}
                        >
                          {edge.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* HTML nodes layer — NO extra transform, just absolute positioning */}
            {tree.nodes.map((node) => (
              <BeneficiaryTreeNode
                key={node.id}
                node={node}
                onClick={() => setSelectedNode(node.id)}
                isSelected={selectedNode === node.id}
              />
            ))}
          </div>

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
