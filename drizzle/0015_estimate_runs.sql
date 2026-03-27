CREATE TYPE "public"."estimate_source" AS ENUM('d2c', 'advisor');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assumption_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_label" text NOT NULL,
	"product_line" text NOT NULL,
	"effective_from" text NOT NULL,
	"effective_to" text,
	"parameters" jsonb NOT NULL,
	"change_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "estimate_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid,
	"user_id" text NOT NULL,
	"source" "estimate_source" NOT NULL,
	"assumption_version_id" uuid NOT NULL,
	"engine_id" text NOT NULL,
	"engine_version" text NOT NULL,
	"provider_key" text NOT NULL,
	"inputs" jsonb NOT NULL,
	"outputs" jsonb NOT NULL,
	"run_number" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "estimate_run" ADD CONSTRAINT "estimate_run_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "estimate_run" ADD CONSTRAINT "estimate_run_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "estimate_run" ADD CONSTRAINT "estimate_run_assumption_version_id_assumption_version_id_fk" FOREIGN KEY ("assumption_version_id") REFERENCES "public"."assumption_version"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assumption_version_product_line_idx" ON "assumption_version" USING btree ("product_line");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assumption_version_effective_from_idx" ON "assumption_version" USING btree ("effective_from");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "estimate_run_client_id_idx" ON "estimate_run" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "estimate_run_user_id_idx" ON "estimate_run" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "estimate_run_assumption_version_id_idx" ON "estimate_run" USING btree ("assumption_version_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "estimate_run_created_at_idx" ON "estimate_run" USING btree ("created_at");
