"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/client-utils";
import type { Asset } from "@/types/asset";

interface AssetDiversificationChartProps {
  assets: Asset[];
}

// Hardcoded hex colors — Recharts SVG attributes don't resolve CSS var()
const CHART_COLORS = [
  "#1E3A5F", // Deep navy
  "#10B981", // Emerald
  "#2D8C9E", // Teal
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
  "#EF4444", // Red
  "#5B8C5A", // Sage green
  "#C4A35A", // Gold
];

/**
 * Get a human-readable label for an asset type slug
 */
function formatAssetType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function AssetDiversificationChart({
  assets,
}: AssetDiversificationChartProps) {
  const diversificationData = useMemo(() => {
    if (assets.length === 0) return [];

    const assetsByClass = assets.reduce(
      (acc, asset) => {
        const className = asset.type || "other";
        if (!acc[className]) {
          acc[className] = 0;
        }
        acc[className] += Number(asset.currentValue) || 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(assetsByClass)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({
        name: formatAssetType(name),
        value: Math.round(value),
      }));
  }, [assets]);

  if (diversificationData.length === 0) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Asset Diversification</CardTitle>
          <CardDescription>Distribution across asset classes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 flex h-[300px] items-center justify-center rounded-xl border">
            <p className="text-muted-foreground px-4 text-center">
              No assets to display.
              <br />
              <span className="text-sm">
                Add assets to see diversification.
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = diversificationData.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Asset Diversification</CardTitle>
        <CardDescription>Total: {formatCurrency(total)}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={diversificationData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {diversificationData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatCurrency(value as number)}
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  borderRadius: "8px",
                  border: "1px solid rgba(0, 0, 0, 0.1)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  padding: "8px 12px",
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={40}
                iconType="circle"
                formatter={(value) => (
                  <span className="text-foreground text-sm">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
