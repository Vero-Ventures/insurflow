ALTER TABLE "estimate_run" ALTER COLUMN "client_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "estimate_run" DROP CONSTRAINT IF EXISTS "estimate_run_client_id_client_id_fk";
--> statement-breakpoint
ALTER TABLE "estimate_run" DROP CONSTRAINT IF EXISTS "estimate_run_user_id_user_id_fk";
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "estimate_run" ADD CONSTRAINT "estimate_run_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "estimate_run" ADD CONSTRAINT "estimate_run_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
