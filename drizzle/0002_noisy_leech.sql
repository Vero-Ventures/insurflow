CREATE INDEX "asset_client_id_deleted_at_idx" ON "asset" USING btree ("client_id","deleted_at");--> statement-breakpoint
CREATE INDEX "client_user_id_deleted_at_idx" ON "client" USING btree ("user_id","deleted_at");--> statement-breakpoint
CREATE INDEX "debt_client_id_deleted_at_idx" ON "debt" USING btree ("client_id","deleted_at");