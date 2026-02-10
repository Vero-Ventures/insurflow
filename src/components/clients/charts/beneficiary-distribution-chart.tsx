"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const COLORS = [
  "oklch(0.35 0.08 250)",
  "oklch(0.696 0.17 162.48)",
  "oklch(0.824 0.092 195.01)",
  "oklch(0.778 0.093 99.28)",
  "oklch(0.557 0.204 27.33)",
];

export function BeneficiaryDistributionChart({
  assets,
  debts,
  settlingCosts,
}: BeneficiaryDistributionChartProps) {
  const distributionData = useMemo(() => {
    const totalAssets = assets.reduce(
      (sum, a) => sum + Number(a.currentValue),
      0,
    );

    const netEstate = totalAssets - debts - settlingCosts;

    // Example distribution (in real app, this would come from client data)
    const data = [
      { name: "Spouse", value: netEstate * 0.5 },
      { name: "Child 1", value: netEstate * 0.25 },
      { name: "Child 2", value: netEstate * 0.25 },
    ].filter((d) => d.value > 0);

    return data;
  }, [assets, debts, settlingCosts]);

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-lg">Beneficiary Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={distributionData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name}: ${(percent * 100).toFixed(0)}%`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {distributionData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload[0]) return null;
                return (
                  <div className="bg-background rounded-lg border p-3 shadow-lg">
                    <p className="mb-1 font-semibold">{payload[0].name}</p>
                    <p className="text-sm">
                      {formatCurrency(payload[0].value as number)}
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
