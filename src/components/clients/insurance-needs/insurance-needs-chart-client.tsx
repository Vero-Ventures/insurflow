"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/client-utils";
import { PieChartIcon } from "lucide-react";
import type { InsuranceNeedsResult } from "@/lib/hooks/use-insurance-needs";

interface InsuranceNeedsChartClientProps {
  result: InsuranceNeedsResult | null;
  isLoading?: boolean;
}

interface ChartData {
  name: string;
  value: number;
  color: string;
}

/**
 * Client-only chart component that imports Recharts.
 * This component should only be loaded dynamically with ssr: false
 * to prevent Recharts from being included in the server/worker bundle.
 */
export function InsuranceNeedsChartClient({
  result,
  isLoading = false,
}: InsuranceNeedsChartClientProps) {
  if (isLoading) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/5 flex h-10 w-10 items-center justify-center rounded-lg">
              <PieChartIcon className="text-primary h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Needs Composition</CardTitle>
              <CardDescription>
                Visual breakdown of gross insurance needs
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 flex h-[300px] items-center justify-center rounded-xl border">
            <p className="text-muted-foreground">Loading chart...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/5 flex h-10 w-10 items-center justify-center rounded-lg">
              <PieChartIcon className="text-primary h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Needs Composition</CardTitle>
              <CardDescription>
                Visual breakdown of gross insurance needs
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 flex h-[300px] items-center justify-center rounded-xl border">
            <p className="text-muted-foreground">No data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const {
    incomeReplacementNeeds,
    debtPayoffNeeds,
    estateBufferNeeds,
    grossNeeds,
  } = result;

  // Don't show chart if there are no gross needs
  if (grossNeeds <= 0) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/5 flex h-10 w-10 items-center justify-center rounded-lg">
              <PieChartIcon className="text-primary h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Needs Composition</CardTitle>
              <CardDescription>
                Visual breakdown of gross insurance needs
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 flex h-[300px] items-center justify-center rounded-xl border">
            <p className="text-muted-foreground px-4 text-center">
              No insurance needs to display.
              <br />
              <span className="text-sm">
                Add income, debts, or estate requirements to see the breakdown.
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Colors matching our design system - navy to emerald gradient
  // Hardcoded hex colors are required because Recharts sets `fill` via
  // SVG DOM attributes, where CSS `var()` functions don't resolve.
  const CHART_COLORS = {
    incomeReplacement: "#1E3A5F", // Deep navy (chart-1)
    debtPayoff: "#2D8C9E", // Teal (chart-3)
    estateBuffer: "#10B981", // Emerald (chart-5)
  } as const;

  const data: ChartData[] = [
    {
      name: "Income Replacement",
      value: incomeReplacementNeeds,
      color: CHART_COLORS.incomeReplacement,
    },
    {
      name: "Debt Payoff",
      value: debtPayoffNeeds,
      color: CHART_COLORS.debtPayoff,
    },
    {
      name: "Estate Buffer",
      value: estateBufferNeeds,
      color: CHART_COLORS.estateBuffer,
    },
  ].filter((item) => item.value > 0);

  if (data.length === 0) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/5 flex h-10 w-10 items-center justify-center rounded-lg">
              <PieChartIcon className="text-primary h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Needs Composition</CardTitle>
              <CardDescription>
                Visual breakdown of gross insurance needs
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 flex h-[300px] items-center justify-center rounded-xl border">
            <p className="text-muted-foreground">No breakdown available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/5 flex h-10 w-10 items-center justify-center rounded-lg">
            <PieChartIcon className="text-primary h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Needs Composition</CardTitle>
            <CardDescription>
              Gross needs total: {formatCurrency(grossNeeds)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry?.color || "#ccc"} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => {
                  if (typeof value !== "number") return value;
                  return;
                }}
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  borderRadius: "8px",
                  border: "1px solid rgba(0, 0, 0, 0.1)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  padding: "8px 12px",
                }}
                wrapperClassName="print:!hidden"
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

        {/* Detailed breakdown — visible only in print */}
        <div className="border-border/60 mt-4 hidden border-t pt-4 print:block">
          <div className="space-y-2">
            {data.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-foreground">{item.name}</span>
                </div>
                <span className="font-currency font-medium">
                  {formatCurrency(item.value)}{" "}
                  <span className="text-muted-foreground font-normal">
                    ({((item.value / grossNeeds) * 100).toFixed(1)}%)
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
