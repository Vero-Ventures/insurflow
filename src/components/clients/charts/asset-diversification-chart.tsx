"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/client-utils";
import type { Asset } from "@/types/asset";

interface AssetDiversificationChartProps {
  assets: Asset[];
}

function generateColorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash & hash;
  }
  const hue = Math.abs(hash) % 360;
  const lightness = 0.5 + (Math.abs(hash) % 30) / 100;
  const chroma = 0.1 + (Math.abs(hash) % 10) / 100;
  return `oklch(${lightness} ${chroma} ${hue})`;
}

export function AssetDiversificationChart({
  assets,
}: AssetDiversificationChartProps) {
  const diversificationData = useMemo(() => {
    const assetsByClass = assets.reduce(
      (acc, asset) => {
        const className = asset.assetType;
        if (!acc[className]) {
          acc[className] = 0;
        }
        acc[className] += Number(asset.currentValue);
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(assetsByClass).map(([name, value]) => ({
      name: name.replace(/([A-Z])/g, " $1").trim(),
      size: value,
      fill: generateColorFromString(name),
    }));
  }, [assets]);

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-lg">Asset Diversification</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <Treemap
            data={diversificationData}
            dataKey="size"
            aspectRatio={4 / 3}
            stroke="#fff"
            fill="#8884d8"
            content={({ x, y, width, height, name, size }) => {
              if (width < 50 || height < 30) return null;
              return (
                <g>
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    style={{
                      fill: generateColorFromString(name as string),
                      stroke: "#fff",
                      strokeWidth: 2,
                    }}
                  />
                  <text
                    x={x + width / 2}
                    y={y + height / 2 - 7}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={12}
                    fontWeight="bold"
                  >
                    {name}
                  </text>
                  <text
                    x={x + width / 2}
                    y={y + height / 2 + 7}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={10}
                  >
                    {formatCurrency(size as number)}
                  </text>
                </g>
              );
            }}
          >
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload[0]) return null;
                return (
                  <div className="bg-background rounded-lg border p-3 shadow-lg">
                    <p className="mb-1 font-semibold">
                      {payload[0].payload.name}
                    </p>
                    <p className="text-sm">
                      {formatCurrency(payload[0].payload.size)}
                    </p>
                  </div>
                );
              }}
            />
          </Treemap>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
