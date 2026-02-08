-- Migration: Update province enum to state enum with US states
-- Generated: 2026-02-07

-- Step 1: Create the new state enum with US states
CREATE TYPE "public"."state_new" AS ENUM('AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC');

-- Step 2: Add new state column to client table
ALTER TABLE "client" ADD COLUMN "state_new" "public"."state_new";

-- Step 3: Drop the old province column
ALTER TABLE "client" DROP COLUMN IF EXISTS "province";
ALTER TABLE "client" DROP COLUMN IF EXISTS "state";

-- Step 4: Rename the new column to state
ALTER TABLE "client" RENAME COLUMN "state_new" TO "state";

-- Step 5: Make state column not null (adjust as needed)
-- ALTER TABLE "client" ALTER COLUMN "state" SET NOT NULL;

-- Step 6: Drop the old province enum
DROP TYPE IF EXISTS "public"."province";

-- Step 7: Rename the new enum to state
ALTER TYPE "public"."state_new" RENAME TO "state";
