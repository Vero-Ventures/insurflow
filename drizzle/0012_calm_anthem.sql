DO $$ BEGIN
  CREATE TYPE "public"."application_status" AS ENUM('draft', 'submitted', 'received', 'in_review', 'additional_info_requested', 'approved', 'declined');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE "public"."audit_entity_type" ADD VALUE 'application';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE "public"."audit_entity_type" ADD VALUE 'application_event';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "application" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"idempotency_key" text,
	"provider_key" text,
	"provider_application_id" text,
	"status" "application_status" DEFAULT 'draft' NOT NULL,
	"consent_captured_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "application_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "application_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"status" "application_status" NOT NULL,
	"source" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "application" ADD CONSTRAINT "application_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "application" ADD CONSTRAINT "application_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "application_event" ADD CONSTRAINT "application_event_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."application"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_client_id_idx" ON "application" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_user_id_idx" ON "application" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_status_idx" ON "application" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_client_id_deleted_at_idx" ON "application" USING btree ("client_id","deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_event_application_id_idx" ON "application_event" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_event_status_idx" ON "application_event" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_event_occurred_at_idx" ON "application_event" USING btree ("occurred_at");