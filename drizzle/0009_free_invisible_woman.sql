CREATE TYPE "public"."inquiry_status" AS ENUM('pending', 'completed', 'viewed', 'claimed', 'converted', 'archived');--> statement-breakpoint
CREATE TABLE "inquiry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "inquiry_status" DEFAULT 'pending' NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"referral_source" text,
	"household_status" "household_status",
	"annual_household_income" numeric(14, 2),
	"total_debts" numeric(14, 2),
	"current_coverage" numeric(14, 2),
	"primary_goal" text,
	"estimated_coverage_need" numeric(14, 2),
	"estimated_premium" numeric(14, 2),
	"scenario_id" text,
	"claimed_by_user_id" text,
	"claimed_at" timestamp,
	"converted_to_client_id" text,
	"converted_at" timestamp,
	"consumer_ip_address" text,
	"consumer_user_agent" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "inquiry" ALTER COLUMN "household_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "user_profile" ALTER COLUMN "household_status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."household_status";--> statement-breakpoint
CREATE TYPE "public"."household_status" AS ENUM('single', 'married', 'partnered', 'single_parent');--> statement-breakpoint
ALTER TABLE "inquiry" ALTER COLUMN "household_status" SET DATA TYPE "public"."household_status" USING "household_status"::"public"."household_status";--> statement-breakpoint
ALTER TABLE "user_profile" ALTER COLUMN "household_status" SET DATA TYPE "public"."household_status" USING "household_status"::"public"."household_status";--> statement-breakpoint
ALTER TABLE "inquiry" ADD CONSTRAINT "inquiry_claimed_by_user_id_user_id_fk" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inquiry_status_idx" ON "inquiry" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inquiry_email_idx" ON "inquiry" USING btree ("email");--> statement-breakpoint
CREATE INDEX "inquiry_claimed_by_user_idx" ON "inquiry" USING btree ("claimed_by_user_id");--> statement-breakpoint
CREATE INDEX "inquiry_created_at_idx" ON "inquiry" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "inquiry_deleted_at_idx" ON "inquiry" USING btree ("deleted_at");