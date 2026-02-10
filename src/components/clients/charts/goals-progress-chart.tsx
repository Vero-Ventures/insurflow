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

interface Goal {
  name: string;
  targetAmount: number;
  currentFunding: number;
}

interface GoalsProgressChartProps {
  goals: Goal[];
}

export function GoalsProgressChart({ goals }: GoalsProgressChartProps) {
  const chartData = useMemo(() => {
    return goals.map((goal) => {
      const progress = (goal.currentFunding / goal.targetAmount) * 100;
      return {
        name:
          goal.name.length > 20
            ? `${goal.name.substring(0, 17)}...`
            : goal.name,
        target: goal.targetAmount,
        current: goal.currentFunding,
        remaining: Math.max(0, goal.targetAmount - goal.currentFunding),
        progress: Math.min(100, progress),
      };
    });
  }, [goals]);

  if (goals.length === 0) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">Goals Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 flex h-[300px] items-center justify-center rounded-lg">
            <p className="text-muted-foreground">No goals defined</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-lg">Goals Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              type="number"
              className="text-xs"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category"
              dataKey="name"
              className="text-xs"
              tick={{ fontSize: 11 }}
              width={120}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload[0]) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-background rounded-lg border p-3 shadow-lg">
                    <p className="mb-2 font-semibold">{data.name}</p>
                    <p className="text-emerald text-sm">
                      Current: {formatCurrency(data.current)}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Target: {formatCurrency(data.target)}
                    </p>
                    <p className="text-primary text-sm font-semibold">
                      Progress: {data.progress.toFixed(1)}%
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="current" stackId="a" name="Current Funding">
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.progress >= 100
                      ? "oklch(0.696 0.17 162.48)" // Green - complete
                      : entry.progress >= 50
                        ? "oklch(0.824 0.092 195.01)" // Blue - in progress
                        : "oklch(0.778 0.093 99.28)" // Yellow - needs attention
                  }
                />
              ))}
            </Bar>
            <Bar
              dataKey="remaining"
              stackId="a"
              fill="oklch(0.2 0.025 250 / 0.2)"
              name="Remaining"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
