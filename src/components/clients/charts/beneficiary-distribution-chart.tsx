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
  Legend,
  Tooltip,
} from "recharts";
import { formatCurrency } from "@/lib/client-utils";
import type { Asset } from "@/types/asset";

interface BeneficiaryDistributionChartProps {
  assets: Asset[];
  debts: number;
  settlingCosts: number;
}

// Hardcoded hex colors required — Recharts SVG attributes don't resolve CSS var()
const COLORS = [
  "#1E3A5F", // Deep navy
  "#10B981", // Emerald
  "#2D8C9E", // Teal
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
];

export function BeneficiaryDistributionChart({
  assets,
  debts,
  settlingCosts,
}: BeneficiaryDistributionChartProps) {
  const distributionData = useMemo(() => {
    const totalAssets = assets.reduce(
      (sum, a) => sum + (Number(a.currentValue) || 0),
      0,
    );

    const netEstate = totalAssets - debts - settlingCosts;

    if (netEstate <= 0) return [];

    // Illustrative distribution (in a real app, beneficiary data would come from client record)
    return [
      { name: "Spouse", value: Math.round(netEstate * 0.5) },
      { name: "Child 1", value: Math.round(netEstate * 0.25) },
      { name: "Child 2", value: Math.round(netEstate * 0.25) },
    ];
  }, [assets, debts, settlingCosts]);

  if (distributionData.length === 0) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Beneficiary Distribution</CardTitle>
          <CardDescription>Estimated estate distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 flex h-[300px] items-center justify-center rounded-xl border">
            <p className="text-muted-foreground px-4 text-center">
              No net estate to distribute.
              <br />
              <span className="text-sm">
                Net estate must exceed debts and settling costs.
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = distributionData.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Beneficiary Distribution</CardTitle>
        <CardDescription>Net estate: {formatCurrency(total)}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distributionData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
              >
                {distributionData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
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
