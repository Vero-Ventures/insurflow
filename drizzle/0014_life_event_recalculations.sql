CREATE TYPE "public"."life_event_type" AS ENUM('income_change', 'new_child', 'debt_change', 'marriage', 'divorce');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "life_event_recalculation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"life_event" "life_event_type" NOT NULL,
	"notes" text,
	"triggered_at" timestamp with time zone NOT NULL,
	"before_snapshot" jsonb NOT NULL,
	"after_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "life_event_recalculation" ADD CONSTRAINT "life_event_recalculation_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "life_event_recalculation" ADD CONSTRAINT "life_event_recalculation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "life_event_recalculation_client_id_idx" ON "life_event_recalculation" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "life_event_recalculation_triggered_at_idx" ON "life_event_recalculation" USING btree ("triggered_at");
