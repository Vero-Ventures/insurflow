"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/client-utils";
import type { Debt } from "@/types/debt";

interface DebtAmortizationChartProps {
  debts: Debt[];
}

export function DebtAmortizationChart({ debts }: DebtAmortizationChartProps) {
  const amortizationData = useMemo(() => {
    if (debts.length === 0) return [];

    const totalDebt = debts.reduce(
      (sum, d) => sum + Number(d.currentBalance),
      0,
    );

    // Project debt paydown over 30 years (typical mortgage)
    const years = 30;
    const annualPaydown = totalDebt / years;

    return Array.from({ length: years + 1 }, (_, i) => {
      const year = new Date().getFullYear() + i;
      const remainingDebt = Math.max(0, totalDebt - annualPaydown * i);

      return {
        year,
        debt: Math.round(remainingDebt),
        paid: Math.round(totalDebt - remainingDebt),
      };
    });
  }, [debts]);

  if (debts.length === 0) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">Debt Amortization Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 flex h-[300px] items-center justify-center rounded-lg">
            <p className="text-muted-foreground">No debts to display</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-lg">Debt Amortization Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={amortizationData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="year" className="text-xs" tick={{ fontSize: 12 }} />
            <YAxis
              className="text-xs"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload) return null;
                return (
                  <div className="bg-background rounded-lg border p-3 shadow-lg">
                    <p className="mb-2 font-semibold">
                      {payload[0]?.payload.year}
                    </p>
                    <p className="text-destructive text-sm">
                      Remaining: {formatCurrency(payload[0]?.value as number)}
                    </p>
                    <p className="text-emerald text-sm">
                      Paid: {formatCurrency(payload[1]?.value as number)}
                    </p>
                  </div>
                );
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="debt"
              stackId="1"
              stroke="oklch(0.557 0.204 27.33)"
              fill="oklch(0.557 0.204 27.33)"
              name="Remaining Debt"
            />
            <Area
              type="monotone"
              dataKey="paid"
              stackId="1"
              stroke="oklch(0.696 0.17 162.48)"
              fill="oklch(0.696 0.17 162.48)"
              name="Amount Paid"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
