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
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/client-utils";
import type { Asset } from "@/types/asset";

interface TaxBurdenChartProps {
  assets: Asset[];
  state: string;
}

export function TaxBurdenChart({ assets, state }: TaxBurdenChartProps) {
  const taxData = useMemo(() => {
    const totalValue = assets.reduce(
      (sum, a) => sum + Number(a.currentValue),
      0,
    );

    // Simplified tax calculations by asset type
    const assetsByType = assets.reduce(
      (acc, asset) => {
        const type = asset.assetType;
        if (!acc[type]) {
          acc[type] = { total: 0, taxable: 0 };
        }
        acc[type].total += Number(asset.currentValue);

        // Different tax treatment by type
        switch (type) {
          case "RRSP":
          case "RRIF":
            // Fully taxable at death (assume 40% tax rate)
            acc[type].taxable += Number(asset.currentValue) * 0.4;
            break;
          case "TFSA":
            // Tax-free
            acc[type].taxable += 0;
            break;
          case "Non-Registered":
            // Capital gains tax (50% inclusion, 25% rate)
            acc[type].taxable += Number(asset.currentValue) * 0.125;
            break;
          case "Real Estate":
            // Capital gains on 50% of appreciation (assume 30% appreciation)
            acc[type].taxable += Number(asset.currentValue) * 0.3 * 0.5 * 0.25;
            break;
          default:
            acc[type].taxable += 0;
        }

        return acc;
      },
      {} as Record<string, { total: number; taxable: number }>,
    );

    return Object.entries(assetsByType).map(([type, data]) => ({
      name: type.replace(/([A-Z])/g, " $1").trim(),
      value: Math.round(data.total),
      tax: Math.round(data.taxable),
      afterTax: Math.round(data.total - data.taxable),
    }));
  }, [assets]);

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-lg">Tax Burden by Asset Type</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={taxData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              className="text-xs"
              tick={{ fontSize: 11 }}
              angle={-15}
              textAnchor="end"
              height={60}
            />
            <YAxis
              className="text-xs"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload) return null;
                const data = payload[0]?.payload;
                return (
                  <div className="bg-background rounded-lg border p-3 shadow-lg">
                    <p className="mb-2 font-semibold">{data.name}</p>
                    <p className="text-sm">
                      Gross Value: {formatCurrency(data.value)}
                    </p>
                    <p className="text-destructive text-sm">
                      Tax Burden: {formatCurrency(data.tax)}
                    </p>
                    <p className="text-emerald text-sm font-semibold">
                      After-Tax: {formatCurrency(data.afterTax)}
                    </p>
                  </div>
                );
              }}
            />
            <Legend />
            <Bar
              dataKey="tax"
              stackId="a"
              fill="oklch(0.557 0.204 27.33)"
              name="Tax Burden"
            />
            <Bar
              dataKey="afterTax"
              stackId="a"
              fill="oklch(0.696 0.17 162.48)"
              name="After-Tax Value"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
