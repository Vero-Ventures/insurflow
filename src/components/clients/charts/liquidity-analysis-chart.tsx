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
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/client-utils";
import type { Asset } from "@/types/asset";
import type { Debt } from "@/types/debt";

interface LiquidityAnalysisChartProps {
  assets: Asset[];
  debts: Debt[];
  settlingCosts?: number;
}

/**
 * Classify asset liquidity based on its type string and optional isLiquid flag.
 *
 * Single source of truth for liquidity classification across the app.
 * Matches slugs used in demo data and the asset form:
 * "checking", "savings", "brokerage", "401k", "ira", "roth_ira",
 * "primary_residence", "term_life", "whole_life", etc.
 */
export function classifyLiquidity(
  type: string,
  isLiquid?: boolean,
): "liquid" | "semi-liquid" | "illiquid" {
  // If the asset is explicitly marked as liquid, trust that flag
  if (isLiquid) return "liquid";

  const t = type.toLowerCase();

  if (
    t.includes("checking") ||
    t.includes("savings") ||
    t.includes("cash") ||
    t.includes("money_market") ||
    t.includes("brokerage") ||
    t.includes("emergency")
  ) {
    return "liquid";
  }

  if (
    t.includes("401k") ||
    t.includes("ira") ||
    t.includes("roth") ||
    t.includes("retirement") ||
    t.includes("life") ||
    t.includes("annuity")
  ) {
    return "semi-liquid";
  }

  return "illiquid";
}

const COLORS = {
  liquid: "#10B981",
  semiLiquid: "#3B82F6",
  illiquid: "#F59E0B",
  negative: "#EF4444",
};

export function LiquidityAnalysisChart({
  assets,
  debts,
  settlingCosts = 0,
}: LiquidityAnalysisChartProps) {
  const liquidityData = useMemo(() => {
    const {
      liquid: liquidAssets,
      semiLiquid: semiLiquidAssets,
      illiquid: illiquidAssets,
    } = assets.reduce(
      (acc, asset) => {
        const value = Number(asset.currentValue) || 0;
        const classification = classifyLiquidity(asset.type, asset.isLiquid);
        acc[classification === "semi-liquid" ? "semiLiquid" : classification] +=
          value;
        return acc;
      },
      { liquid: 0, semiLiquid: 0, illiquid: 0 },
    );

    const totalDebts = debts.reduce(
      (sum, d) => sum + (Number(d.currentBalance) || 0),
      0,
    );

    const hasData =
      liquidAssets > 0 ||
      semiLiquidAssets > 0 ||
      illiquidAssets > 0 ||
      totalDebts > 0 ||
      settlingCosts > 0;
    if (!hasData) return [];

    return [
      { name: "Liquid Assets", value: liquidAssets, fill: COLORS.liquid },
      {
        name: "Semi-Liquid",
        value: semiLiquidAssets,
        fill: COLORS.semiLiquid,
      },
      {
        name: "Illiquid Assets",
        value: illiquidAssets,
        fill: COLORS.illiquid,
      },
      {
        name: "Settling Costs",
        value: -settlingCosts,
        fill: COLORS.negative,
      },
      { name: "Debts", value: -totalDebts, fill: COLORS.negative },
    ].filter((d) => d.value !== 0);
  }, [assets, debts, settlingCosts]);

  if (liquidityData.length === 0) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">
            Liquidity Analysis (Assets vs Liabilities at Death)
          </CardTitle>
          <CardDescription>
            Breakdown of asset liquidity and liabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 flex h-[300px] items-center justify-center rounded-xl border">
            <p className="text-muted-foreground px-4 text-center">
              No data available.
              <br />
              <span className="text-sm">
                Add assets or debts to see liquidity analysis.
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
          Liquidity Analysis (Assets vs Liabilities at Death)
        </CardTitle>
        <CardDescription>
          Breakdown of asset liquidity and liabilities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={liquidityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                angle={-15}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const abs = Math.abs(value);
                  const sign = value < 0 ? "-" : "";
                  if (abs >= 1_000_000)
                    return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
                  if (abs >= 1_000)
                    return `${sign}$${(abs / 1_000).toFixed(0)}k`;
                  return `${sign}$${abs}`;
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload[0]) return null;
                  const value = payload[0].value as number;
                  return (
                    <div className="rounded-lg border bg-white p-3 shadow-lg dark:bg-gray-900">
                      <p className="mb-1 font-semibold">
                        {payload[0].payload.name}
                      </p>
                      <p className="text-sm">
                        {value >= 0 ? "+" : ""}
                        {formatCurrency(value)}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="value">
                {liquidityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
