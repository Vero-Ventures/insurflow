CREATE UNIQUE INDEX "client_one_active_draft_per_user_idx" ON "client" USING btree ("user_id") WHERE ("status" = 'draft' AND "deleted_at" IS NULL);
