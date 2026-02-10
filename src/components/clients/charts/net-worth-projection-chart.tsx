"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  inflationRate?: number; // Default 2.5%
}

export function NetWorthProjectionChart({
  assets,
  debts,
  clientIncome = 0,
  inflationRate = 0.025,
}: NetWorthProjectionChartProps) {
  const projectionData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = 10; // Project 10 years

    const totalAssets = assets.reduce(
      (sum, a) => sum + Number(a.currentValue),
      0,
    );
    const totalDebts = debts.reduce((sum, d) => sum + Number(d.balance), 0);
    const currentNetWorth = totalAssets - totalDebts;

    return Array.from({ length: years + 1 }, (_, i) => {
      const year = currentYear + i;

      // Project asset growth (conservative 5% avg)
      const projectedAssets = totalAssets * Math.pow(1.05, i);

      // Project debt reduction (assume 10-year payoff)
      const projectedDebts = Math.max(0, totalDebts * (1 - i / years));

      const projectedNetWorth = projectedAssets - projectedDebts;

      return {
        year,
        assets: Math.round(projectedAssets),
        debts: Math.round(projectedDebts),
        netWorth: Math.round(projectedNetWorth),
      };
    });
  }, [assets, debts]);

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-lg">
          Net Worth Projection (10 Years)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={projectionData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="year" className="text-xs" tick={{ fontSize: 12 }} />
            <YAxis
              className="text-xs"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload) return null;
                return (
                  <div className="bg-background rounded-lg border p-3 shadow-lg">
                    <p className="mb-2 font-semibold">
                      {payload[0]?.payload.year}
                    </p>
                    {payload.map((entry, index) => (
                      <p
                        key={index}
                        className="text-sm"
                        style={{ color: entry.color }}
                      >
                        {entry.name}: {formatCurrency(entry.value as number)}
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="assets"
              stroke="oklch(0.696 0.17 162.48)"
              name="Assets"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="debts"
              stroke="oklch(0.557 0.204 27.33)"
              name="Debts"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="netWorth"
              stroke="oklch(0.35 0.08 250)"
              name="Net Worth"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
