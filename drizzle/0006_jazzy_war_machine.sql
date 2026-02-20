CREATE TYPE "public"."policy_status" AS ENUM('active', 'lapsed', 'surrendered', 'paid_up', 'pending');--> statement-breakpoint
CREATE TYPE "public"."policy_type" AS ENUM('term_life', 'whole_life', 'universal_life', 'variable_life', 'group_life', 'other');--> statement-breakpoint
CREATE TABLE "policy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"policy_number" text,
	"carrier_name" text,
	"type" "policy_type" DEFAULT 'term_life' NOT NULL,
	"face_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"annual_premium" numeric(14, 2),
	"issue_date" date,
	"expiry_date" date,
	"cash_value" numeric(14, 2),
	"status" "policy_status" DEFAULT 'active' NOT NULL,
	"riders" text,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "policy" ADD CONSTRAINT "policy_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "policy_client_id_idx" ON "policy" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "policy_type_idx" ON "policy" USING btree ("type");--> statement-breakpoint
CREATE INDEX "policy_status_idx" ON "policy" USING btree ("status");--> statement-breakpoint
CREATE INDEX "policy_client_id_deleted_at_idx" ON "policy" USING btree ("client_id","deleted_at");