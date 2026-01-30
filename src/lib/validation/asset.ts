import { z } from "zod";

/**
 * Enum of supported asset types
 */
export const ASSET_TYPES = [
  "rrsp",
  "tfsa",
  "non_registered",
  "rrif",
  "lira",
  "lif",
  "real_estate",
  "life_insurance",
  "business_interest",
  "pension",
  "stock_options",
  "cryptocurrency",
  "collectibles",
  "other",
] as const;

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
