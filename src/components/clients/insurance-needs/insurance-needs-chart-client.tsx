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
import type { InsuranceNeedsResult } from "@/lib/hooks/use-insurance-needs";

interface InsuranceNeedsChartClientProps {
  result: InsuranceNeedsResult | null;
  isLoading?: boolean;
  /** When true, renders inline labels instead of tooltip-only (for print/PDF) */
  showLabels?: boolean;
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
  showLabels = false,
}: InsuranceNeedsChartClientProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Needs Composition</CardTitle>
          <CardDescription>
            Visual breakdown of gross insurance needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 flex h-[300px] items-center justify-center rounded-lg">
            <p className="text-muted-foreground">Loading chart...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Needs Composition</CardTitle>
          <CardDescription>
            Visual breakdown of gross insurance needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 flex h-[300px] items-center justify-center rounded-lg">
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
      <Card>
        <CardHeader>
          <CardTitle>Needs Composition</CardTitle>
          <CardDescription>
            Visual breakdown of gross insurance needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 flex h-[300px] items-center justify-center rounded-lg">
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

  // Hardcoded hex colors are required because Recharts sets `fill` via
  // SVG DOM attributes, where CSS `var()` functions don't resolve.
  const CHART_COLORS = {
    primary: "#3B82F6", // blue-500  (Income Replacement)
    destructive: "#EF4444", // red-500   (Debt Payoff)
    warning: "#F59E0B", // amber-500 (Estate Buffer)
  } as const;

  const data: ChartData[] = [
    {
      name: "Income Replacement",
      value: incomeReplacementNeeds,
      color: CHART_COLORS.primary,
    },
    {
      name: "Debt Payoff",
      value: debtPayoffNeeds,
      color: CHART_COLORS.destructive,
    },
    {
      name: "Estate Buffer",
      value: estateBufferNeeds,
      color: CHART_COLORS.warning,
    },
  ].filter((item) => item.value > 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Needs Composition</CardTitle>
          <CardDescription>
            Visual breakdown of gross insurance needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 flex h-[300px] items-center justify-center rounded-lg">
            <p className="text-muted-foreground">No breakdown available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Needs Composition</CardTitle>
        <CardDescription>
          Visual breakdown of gross insurance needs (
          {formatCurrency(grossNeeds)})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry?.color || "#ccc"} />
                ))}
              </Pie>
              {!showLabels && (
                <Tooltip
                  formatter={(value: number | undefined) =>
                    typeof value === "number" ? formatCurrency(value) : ""
                  }
                />
              )}
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Print-only detailed breakdown */}
        {showLabels && (
          <div className="mt-4 border-t pt-3">
            <div className="space-y-1.5">
              {data.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium">
                    {formatCurrency(item.value)} (
                    {((item.value / grossNeeds) * 100).toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
