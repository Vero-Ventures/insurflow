CREATE TABLE IF NOT EXISTS "webhook_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"status" "application_status" NOT NULL,
	"event_timestamp" timestamp with time zone NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "webhook_event" ADD CONSTRAINT "webhook_event_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "webhook_event_provider_event_id_uniq" ON "webhook_event" USING btree ("provider","provider_event_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_event_client_id_event_timestamp_idx" ON "webhook_event" USING btree ("client_id","event_timestamp");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_event_provider_idx" ON "webhook_event" USING btree ("provider");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_event_status_idx" ON "webhook_event" USING btree ("status");
