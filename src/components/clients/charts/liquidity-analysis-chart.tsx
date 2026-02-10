"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/client-utils";
import type { Asset } from "@/types/asset";
import type { Debt } from "@/types/debt";

interface LiquidityAnalysisChartProps {
  assets: Asset[];
  debts: Debt[];
  settlingCosts?: number;
}

export function LiquidityAnalysisChart({
  assets,
  debts,
  settlingCosts = 0,
}: LiquidityAnalysisChartProps) {
  const liquidityData = useMemo(() => {
    // Categorize assets by liquidity
    const liquidAssets = assets
      .filter((a) =>
        ["Checking", "Savings", "TFSA", "Non-Registered"].includes(a.assetType),
      )
      .reduce((sum, a) => sum + Number(a.currentValue), 0);

    const semiLiquidAssets = assets
      .filter((a) => ["RRSP", "RRIF", "Life Insurance"].includes(a.assetType))
      .reduce((sum, a) => sum + Number(a.currentValue), 0);

    const illiquidAssets = assets
      .filter((a) =>
        ["Real Estate", "Business Interest", "Other"].includes(a.assetType),
      )
      .reduce((sum, a) => sum + Number(a.currentValue), 0);

    const totalDebts = debts.reduce((sum, d) => sum + Number(d.balance), 0);

    const data = [
      {
        name: "Liquid Assets",
        value: liquidAssets,
        fill: "oklch(0.696 0.17 162.48)",
      },
      {
        name: "Semi-Liquid",
        value: semiLiquidAssets,
        fill: "oklch(0.824 0.092 195.01)",
      },
      {
        name: "Illiquid Assets",
        value: illiquidAssets,
        fill: "oklch(0.778 0.093 99.28)",
      },
      {
        name: "Settling Costs",
        value: -settlingCosts,
        fill: "oklch(0.557 0.204 27.33)",
      },
      {
        name: "Debts",
        value: -totalDebts,
        fill: "oklch(0.557 0.204 27.33)",
      },
    ];

    return data;
  }, [assets, debts, settlingCosts]);

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-lg">
          Liquidity Analysis (Assets vs Liabilities at Death)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={liquidityData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              className="text-xs"
              tick={{ fontSize: 11 }}
              angle={-15}
              textAnchor="end"
              height={80}
            />
            <YAxis
              className="text-xs"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) =>
                `${value >= 0 ? "" : "-"}$${Math.abs(value / 1000).toFixed(0)}k`
              }
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload[0]) return null;
                const value = payload[0].value as number;
                return (
                  <div className="bg-background rounded-lg border p-3 shadow-lg">
                    <p className="mb-1 font-semibold">
                      {payload[0].payload.name}
                    </p>
                    <p className="text-sm">
                      {value >= 0 ? "+" : ""}
                      {formatCurrency(value)}
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="value">
              {liquidityData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
