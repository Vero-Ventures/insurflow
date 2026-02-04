-- Add indexes for session and account tables
-- Improves lookup performance for authentication operations

-- Index for looking up sessions by user (auth checks, session listing)
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint

-- Index for looking up accounts by user  
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint

-- Unique constraint to prevent duplicate OAuth accounts (same provider + account combo)
CREATE UNIQUE INDEX "account_provider_account_idx" ON "account" USING btree ("provider_id","account_id");
