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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/client-utils";
import { classifyLiquidity } from "@/lib/calculations/liquidity-analysis";
import type { Asset } from "@/types/asset";
import type { Debt } from "@/types/debt";

interface DebtAmortizationChartProps {
  debts: Debt[];
}

/** Number of years for the debt amortization projection */
const PROJECTION_YEARS = 30;

// Hardcoded hex colors required — Recharts SVG attributes don't resolve CSS var()
const COLORS = {
  debt: "#EF4444",
  paid: "#10B981",
};

export function DebtAmortizationChart({ debts }: DebtAmortizationChartProps) {
  const amortizationData = useMemo(() => {
    const totalDebt = debts.reduce(
      (sum, d) => sum + (Number(d.currentBalance) || 0),
      0,
    );

    if (totalDebt === 0) return [];

    return Array.from({ length: PROJECTION_YEARS + 1 }, (_, i) => {
      const remainingDebt = Math.max(0, totalDebt * (1 - i / PROJECTION_YEARS));
      return {
        year: new Date().getFullYear() + i,
        debt: Math.round(remainingDebt),
        paid: Math.round(totalDebt - remainingDebt),
      };
    });
  }, [debts]);

  if (amortizationData.length === 0) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Debt Amortization Timeline</CardTitle>
          <CardDescription>Projected debt payoff over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 flex h-[300px] items-center justify-center rounded-xl border">
            <p className="text-muted-foreground">No debts to display</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Debt Amortization Timeline</CardTitle>
        <CardDescription>
          Projected debt payoff over {PROJECTION_YEARS} years
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={amortizationData}>
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
                formatter={(value) => formatCurrency(value as number)}
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  borderRadius: "8px",
                  border: "1px solid rgba(0, 0, 0, 0.1)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  padding: "8px 12px",
                }}
              />
              <Legend />
              <Bar
                dataKey="debt"
                isAnimationActive={false}
                fill={COLORS.debt}
                name="Remaining Debt"
              />
              <Bar
                dataKey="paid"
                isAnimationActive={false}
                fill={COLORS.paid}
                name="Amount Paid"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
