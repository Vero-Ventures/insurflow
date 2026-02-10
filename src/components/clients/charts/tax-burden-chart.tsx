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
} from "recharts";
import { formatCurrency } from "@/lib/client-utils";
import type { Asset } from "@/types/asset";

interface TaxBurdenChartProps {
  assets: Asset[];
  state: string;
}

const COLORS = {
  tax: "#EF4444",
  afterTax: "#10B981",
};

/**
 * Get a human-readable label for an asset type slug
 */
function formatAssetType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Get estimated tax rate based on asset type.
 * Uses the same type slugs as demo data: "401k", "brokerage",
 * "primary_residence", "term_life", "savings", etc.
 */
function getTaxRate(type: string): number {
  const t = type.toLowerCase();

  // Tax-deferred retirement accounts — fully taxable at ordinary income rates
  if (t.includes("401k") || t.includes("ira") || t.includes("retirement")) {
    return 0.3;
  }
  // Roth accounts — tax-free
  if (t.includes("roth")) {
    return 0;
  }
  // Brokerage / investment — capital gains
  if (t.includes("brokerage") || t.includes("investment")) {
    return 0.075;
  }
  // Real estate — capital gains on appreciation
  if (
    t.includes("real_estate") ||
    t.includes("residence") ||
    t.includes("property")
  ) {
    return 0.045;
  }
  // Life insurance — generally tax-free death benefit
  if (t.includes("life") || t.includes("insurance")) {
    return 0;
  }
  // Cash / savings / checking — no tax
  if (
    t.includes("savings") ||
    t.includes("checking") ||
    t.includes("cash") ||
    t.includes("emergency")
  ) {
    return 0;
  }
  // Default conservative estimate
  return 0.05;
}

export function TaxBurdenChart({ assets }: TaxBurdenChartProps) {
  const taxData = useMemo(() => {
    if (assets.length === 0) return [];

    const assetsByType = assets.reduce(
      (acc, asset) => {
        const type = asset.type || "other";
        if (!acc[type]) {
          acc[type] = { total: 0, taxable: 0 };
        }
        const value = Number(asset.currentValue) || 0;
        const taxRate = getTaxRate(type);

        acc[type].total += value;
        acc[type].taxable += value * taxRate;
        return acc;
      },
      {} as Record<string, { total: number; taxable: number }>,
    );

    return Object.entries(assetsByType).map(([type, data]) => ({
      name: formatAssetType(type),
      value: Math.round(data.total),
      tax: Math.round(data.taxable),
      afterTax: Math.round(data.total - data.taxable),
    }));
  }, [assets]);

  if (taxData.length === 0) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Tax Burden by Asset Type</CardTitle>
          <CardDescription>
            Estimated tax impact on each asset class
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 flex h-[300px] items-center justify-center rounded-xl border">
            <p className="text-muted-foreground px-4 text-center">
              No assets to analyze.
              <br />
              <span className="text-sm">
                Add assets to see estimated tax burden.
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
        <CardTitle className="text-lg">Tax Burden by Asset Type</CardTitle>
        <CardDescription>
          Estimated tax impact on each asset class
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={taxData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                angle={-15}
                textAnchor="end"
                height={60}
              />
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
                content={({ active, payload }) => {
                  if (!active || !payload || !payload[0]) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-white p-3 shadow-lg dark:bg-gray-900">
                      <p className="mb-2 font-semibold">{data.name}</p>
                      <p className="text-sm">
                        Gross Value: {formatCurrency(data.value)}
                      </p>
                      <p className="text-sm text-red-500">
                        Tax Burden: {formatCurrency(data.tax)}
                      </p>
                      <p className="text-sm font-semibold text-emerald-600">
                        After-Tax: {formatCurrency(data.afterTax)}
                      </p>
                    </div>
                  );
                }}
              />
              <Legend />
              <Bar
                dataKey="afterTax"
                stackId="a"
                fill={COLORS.afterTax}
                name="After-Tax Value"
              />
              <Bar
                dataKey="tax"
                stackId="a"
                fill={COLORS.tax}
                name="Tax Burden"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
