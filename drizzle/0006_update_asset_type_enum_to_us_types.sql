-- Migration: Update asset_type enum to US asset types
-- Generated: 2026-02-07

-- Step 1: Create the new asset_type enum with US types
CREATE TYPE "public"."asset_type_new" AS ENUM(
  '401k',
  '403b',
  'ira_traditional',
  'ira_roth',
  'sep_ira',
  'simple_ira',
  'brokerage',
  'hsa',
  '529_plan',
  'real_estate',
  'life_insurance',
  'business_interest',
  'pension',
  'stock_options',
  'cryptocurrency',
  'collectibles',
  'savings',
  'other'
);

-- Step 2: Add new type column to asset table
ALTER TABLE "asset" ADD COLUMN "type_new" "public"."asset_type_new";

-- NOTE: This migration drops existing asset type data. If you need to preserve
-- data, add an UPDATE step before dropping columns to map old values to the
-- new enum.
-- Example (replace mappings as needed):
-- UPDATE "asset"
-- SET "type_new" = CASE
--   WHEN "type" = 'rrsp' THEN '401k'
--   WHEN "type" = 'tfsa' THEN 'ira_roth'
--   WHEN "type" = 'non_registered' THEN 'brokerage'
--   WHEN "type" = 'rrif' THEN 'ira_traditional'
--   WHEN "type" = 'lira' THEN 'ira_traditional'
--   WHEN "type" = 'lif' THEN 'ira_traditional'
--   WHEN "type" IN ('real_estate', 'life_insurance', 'business_interest', 'pension', 'stock_options', 'cryptocurrency', 'collectibles', 'other') THEN "type"::text::"public"."asset_type_new"
--   ELSE 'other'
-- END;

-- Step 3: Drop the old type column
ALTER TABLE "asset" DROP COLUMN IF EXISTS "type";

-- Step 4: Rename the new column to type
ALTER TABLE "asset" RENAME COLUMN "type_new" TO "type";

-- Step 5: Make type column not null (adjust as needed)
-- ALTER TABLE "asset" ALTER COLUMN "type" SET NOT NULL;

-- Step 6: Drop the old asset_type enum
DROP TYPE IF EXISTS "public"."asset_type";

-- Step 7: Rename the new enum to asset_type
ALTER TYPE "public"."asset_type_new" RENAME TO "asset_type";
