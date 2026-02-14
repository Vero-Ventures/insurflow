import { z } from "zod";

/**
 * Enum of supported asset types (US market)
 */
export const ASSET_TYPES = [
  "401k",
  "403b",
  "ira_traditional",
  "ira_roth",
  "sep_ira",
  "simple_ira",
  "brokerage",
  "hsa",
  "529_plan",
  "real_estate",
  "life_insurance",
  "business_interest",
  "pension",
  "stock_options",
  "cryptocurrency",
  "collectibles",
  "savings",
  "other",
] as const;

export type AssetType = (typeof ASSET_TYPES)[number];

/**
 * Human-readable labels for asset types
 */
export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  "401k": "401(k)",
  "403b": "403(b)",
  ira_traditional: "Traditional IRA",
  ira_roth: "Roth IRA",
  sep_ira: "SEP IRA",
  simple_ira: "SIMPLE IRA",
  brokerage: "Brokerage Account",
  hsa: "HSA",
  "529_plan": "529 Plan",
  real_estate: "Real Estate",
  life_insurance: "Life Insurance",
  business_interest: "Business Interest",
  pension: "Pension",
  stock_options: "Stock Options",
  cryptocurrency: "Cryptocurrency",
  collectibles: "Collectibles",
  savings: "Savings Account",
  other: "Other",
};

/**
 * Validation schema for asset type enum
 */
export const assetTypeSchema = z.enum(ASSET_TYPES);

/**
 * Validation schema for current value
 * Kept as string to match database schema and avoid unnecessary conversions
 */
export const currentValueSchema = z.string().refine(
  (val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  },
  { message: "Current value must be a valid positive number" },
);

/**
 * Validation schema for creating an asset
 */
export const createAssetSchema = z
  .object({
    name: z.string().min(1, "Asset name is required").max(255),
    type: assetTypeSchema,
    currentValue: currentValueSchema,
    isLiquid: z.boolean(),
  })
  .strict();

/**
 * Validation schema for updating an asset
 */
export const updateAssetSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    type: assetTypeSchema.optional(),
    currentValue: currentValueSchema.optional(),
    isLiquid: z.boolean().optional(),
  })
  .strict();
