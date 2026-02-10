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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/client-utils";
import type { Asset } from "@/types/asset";
import type { Debt } from "@/types/debt";

interface NetWorthProjectionChartProps {
  assets: Asset[];
  debts: Debt[];
  clientIncome?: number;
}

// Hardcoded hex colors — Recharts SVG attributes don't resolve CSS var()
const COLORS = {
  assets: "#10B981",
  debts: "#EF4444",
  netWorth: "#1E3A5F",
};

export function NetWorthProjectionChart({
  assets,
  debts,
}: NetWorthProjectionChartProps) {
  const projectionData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = 10;

    const totalAssets = assets.reduce(
      (sum, a) => sum + (Number(a.currentValue) || 0),
      0,
    );
    const totalDebts = debts.reduce(
      (sum, d) => sum + (Number(d.currentBalance) || 0),
      0,
    );

    if (totalAssets === 0 && totalDebts === 0) return [];

    return Array.from({ length: years + 1 }, (_, i) => {
      const projectedAssets = totalAssets * Math.pow(1.05, i);
      const projectedDebts = Math.max(0, totalDebts * (1 - i / years));

      return {
        year: currentYear + i,
        assets: Math.round(projectedAssets),
        debts: Math.round(projectedDebts),
        netWorth: Math.round(projectedAssets - projectedDebts),
      };
    });
  }, [assets, debts]);

  if (projectionData.length === 0) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">
            Net Worth Projection (10 Years)
          </CardTitle>
          <CardDescription>
            Projected growth based on current assets and debts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 flex h-[300px] items-center justify-center rounded-xl border">
            <p className="text-muted-foreground px-4 text-center">
              No assets or debts to project.
              <br />
              <span className="text-sm">
                Add assets or debts to see projections.
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">
          Net Worth Projection (10 Years)
        </CardTitle>
        <CardDescription>
          Projected growth based on current assets and debts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={projectionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  if (value >= 1_000_000)
                    return `$${(value / 1_000_000).toFixed(1)}M`;
                  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
                  return `$${value}`;
                }}
              />
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
              <Legend />
              <Line
                type="monotone"
                dataKey="assets"
                stroke={COLORS.assets}
                name="Assets"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="debts"
                stroke={COLORS.debts}
                name="Debts"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="netWorth"
                stroke={COLORS.netWorth}
                name="Net Worth"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
