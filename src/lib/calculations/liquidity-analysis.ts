/**
 * Liquidity analysis calculations
 */

import type { Asset } from "@/types/asset";
import type { Debt } from "@/types/debt";

export interface LiquidityBreakdown {
  liquidAssets: number;
  semiLiquidAssets: number;
  illiquidAssets: number;
  debts: number;
  settlingCosts: number;
  netLiquidity: number;
}

/**
 * Asset liquidity classification
 */
const LIQUIDITY_MAP = {
  // Highly liquid
  checking: "liquid",
  savings: "liquid",
  brokerage: "liquid",
  // Semi-liquid (penalties/taxes to access)
  "401k": "semi-liquid",
  ira: "semi-liquid",
  roth_ira: "semi-liquid",
  roth_401k: "semi-liquid",
  // Illiquid (time to sell)
  real_estate: "illiquid",
  "529_plan": "illiquid",
  other: "illiquid",
} as const;

/**
 * Calculate liquidity breakdown at death
 */
export function calculateLiquidityBreakdown(
  assets: Asset[],
  debts: Debt[],
  settlingCosts: number,
): LiquidityBreakdown {
  const liquidAssets = assets
    .filter(
      (a) => LIQUIDITY_MAP[a.type as keyof typeof LIQUIDITY_MAP] === "liquid",
    )
    .reduce((sum, a) => sum + Number(a.currentValue), 0);

  const semiLiquidAssets = assets
    .filter(
      (a) =>
        LIQUIDITY_MAP[a.type as keyof typeof LIQUIDITY_MAP] === "semi-liquid",
    )
    .reduce((sum, a) => sum + Number(a.currentValue), 0);

  const illiquidAssets = assets
    .filter(
      (a) => LIQUIDITY_MAP[a.type as keyof typeof LIQUIDITY_MAP] === "illiquid",
    )
    .reduce((sum, a) => sum + Number(a.currentValue), 0);

  const totalDebts = debts.reduce(
    (sum, d) => sum + Number(d.currentBalance),
    0,
  );

  const netLiquidity =
    liquidAssets +
    semiLiquidAssets +
    illiquidAssets -
    totalDebts -
    settlingCosts;

  return {
    liquidAssets: Math.round(liquidAssets),
    semiLiquidAssets: Math.round(semiLiquidAssets),
    illiquidAssets: Math.round(illiquidAssets),
    debts: Math.round(totalDebts),
    settlingCosts: Math.round(settlingCosts),
    netLiquidity: Math.round(netLiquidity),
  };
}
