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
import type { USSettlingRequirementsResult } from "@/lib/financial/settling-requirements-us";

interface SettlingRequirementsChartClientProps {
  result: USSettlingRequirementsResult | null;
  isLoading?: boolean;
}

interface ChartData {
  name: string;
  value: number;
  color: string;
}

// Colors matching our design system - using distinct colors for each category
// Hardcoded hex colors are required because Recharts sets `fill` via
// SVG DOM attributes, where CSS `var()` functions don't resolve.
const CHART_COLORS = {
  probate: "#1E3A5F", // Deep navy (chart-1)
  incomeTax: "#5B8C5A", // Sage green (chart-2)
  federalEstate: "#2D8C9E", // Teal (chart-3)
  stateEstate: "#C4A35A", // Gold (chart-4)
  professional: "#8B5CF6", // Purple
  funeral: "#10B981", // Emerald (chart-5)
} as const;

/**
 * Shared card header for chart component
 */
function ChartCardHeader({ description }: { description: string }) {
  return (
    <CardHeader className="pb-4">
      <div className="flex items-center gap-3">
        <div className="bg-primary/5 flex h-10 w-10 items-center justify-center rounded-lg">
          <PieChartIcon className="text-primary h-5 w-5" />
        </div>
        <div>
          <CardTitle className="text-lg">Cost Breakdown</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
  );
}

/**
 * Empty/loading state content for the chart
 */
function ChartPlaceholderContent({
  message,
  submessage,
}: {
  message: string;
  submessage?: string;
}) {
  return (
    <CardContent>
      <div className="bg-muted/30 flex h-[300px] items-center justify-center rounded-xl border">
        <p className="text-muted-foreground px-4 text-center">
          {message}
          {submessage && (
            <>
              <br />
              <span className="text-sm">{submessage}</span>
            </>
          )}
        </p>
      </div>
    </CardContent>
  );
}

/**
 * Build chart data from result
 */
function buildChartData(result: USSettlingRequirementsResult): ChartData[] {
  const {
    probateFees,
    federalEstateTax,
    stateEstateTax,
    finalIncomeTax,
    professionalFees,
    funeralExpenses,
  } = result;

  return [
    { name: "Probate Fees", value: probateFees, color: CHART_COLORS.probate },
    {
      name: "Final Income Tax",
      value: finalIncomeTax,
      color: CHART_COLORS.incomeTax,
    },
    {
      name: "Federal Estate Tax",
      value: federalEstateTax,
      color: CHART_COLORS.federalEstate,
    },
    {
      name: "State Estate Tax",
      value: stateEstateTax,
      color: CHART_COLORS.stateEstate,
    },
    {
      name: "Professional Fees",
      value: professionalFees.total,
      color: CHART_COLORS.professional,
    },
    {
      name: "Funeral Expenses",
      value: funeralExpenses,
      color: CHART_COLORS.funeral,
    },
  ].filter((item) => item.value > 0);
}

/**
 * Client-only chart component that imports Recharts.
 * This component should only be loaded dynamically with ssr: false
 * to prevent Recharts from being included in the server/worker bundle.
 */
export function SettlingRequirementsChartClient({
  result,
  isLoading = false,
}: SettlingRequirementsChartClientProps) {
  const defaultDescription = "Visual breakdown of estate settling costs";

  if (isLoading) {
    return (
      <Card className="border-border/60 shadow-sm">
        <ChartCardHeader description={defaultDescription} />
        <ChartPlaceholderContent message="Loading chart..." />
      </Card>
    );
  }

  if (!result) {
    return (
      <Card className="border-border/60 shadow-sm">
        <ChartCardHeader description={defaultDescription} />
        <ChartPlaceholderContent message="No data available" />
      </Card>
    );
  }

  const { totalSettlingRequirements } = result;

  if (totalSettlingRequirements <= 0) {
    return (
      <Card className="border-border/60 shadow-sm">
        <ChartCardHeader description={defaultDescription} />
        <ChartPlaceholderContent
          message="No settling costs to display."
          submessage="Add assets or income data to see the breakdown."
        />
      </Card>
    );
  }

  const data = buildChartData(result);

  if (data.length === 0) {
    return (
      <Card className="border-border/60 shadow-sm">
        <ChartCardHeader description={defaultDescription} />
        <ChartPlaceholderContent message="No breakdown available" />
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <ChartCardHeader
        description={`Total costs: ${formatCurrency(totalSettlingRequirements)}`}
      />
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
                formatter={(value: number | undefined) =>
                  typeof value === "number" ? formatCurrency(value) : ""
                }
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
                    (
                    {((item.value / totalSettlingRequirements) * 100).toFixed(
                      1,
                    )}
                    %)
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
