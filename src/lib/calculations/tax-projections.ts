/**
 * Tax burden projections by asset type
 */

import type { Asset } from "@/types/asset";

export interface TaxByAssetType {
  name: string;
  value: number;
  tax: number;
  afterTax: number;
}

/**
 * Tax rates by asset type (simplified US tax treatment)
 */
const TAX_RATES = {
  // Tax-deferred accounts - fully taxable at ordinary income rates
  "401k": 0.4,
  ira: 0.4,
  // Roth accounts - tax-free
  roth_ira: 0,
  roth_401k: 0,
  // Brokerage - capital gains tax (assume 30% appreciation, 15% rate)
  brokerage: 0.045, // 30% * 50% inclusion * 15% rate
  // Real estate - capital gains (assume 30% appreciation, 15% rate)
  real_estate: 0.045,
  // 529 plans - tax-free for education
  "529_plan": 0,
  // Cash - no tax on death
  checking: 0,
  savings: 0,
  // Other - conservative 10%
  other: 0.1,
} as const;

/**
 * Calculate tax burden by asset type
 */
export function calculateTaxByAssetType(assets: Asset[]): TaxByAssetType[] {
  const assetsByType = assets.reduce(
    (acc, asset) => {
      const type = asset.type;
      if (!acc[type]) {
        acc[type] = { total: 0, tax: 0 };
      }

      const value = Number(asset.currentValue);
      const taxRate = TAX_RATES[type as keyof typeof TAX_RATES] ?? 0.1;
      const tax = value * taxRate;

      acc[type].total += value;
      acc[type].tax += tax;

      return acc;
    },
    {} as Record<string, { total: number; tax: number }>,
  );

  return Object.entries(assetsByType).map(([type, data]) => ({
    name: type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    value: Math.round(data.total),
    tax: Math.round(data.tax),
    afterTax: Math.round(data.total - data.tax),
  }));
}
