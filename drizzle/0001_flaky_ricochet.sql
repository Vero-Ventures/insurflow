CREATE TYPE "public"."asset_type" AS ENUM('rrsp', 'tfsa', 'non_registered', 'rrif', 'lira', 'lif', 'real_estate', 'life_insurance', 'business_interest', 'pension', 'stock_options', 'cryptocurrency', 'collectibles', 'other');--> statement-breakpoint
CREATE TYPE "public"."debt_type" AS ENUM('mortgage', 'heloc', 'car_loan', 'student_loan', 'personal_loan', 'credit_card', 'line_of_credit', 'business_loan', 'other');--> statement-breakpoint
CREATE TABLE "asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "asset_type" NOT NULL,
	"current_value" numeric(14, 2) DEFAULT '0' NOT NULL,
	"is_liquid" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "debt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "debt_type" NOT NULL,
	"current_balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt" ADD CONSTRAINT "debt_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_client_id_idx" ON "asset" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "asset_type_idx" ON "asset" USING btree ("type");--> statement-breakpoint
CREATE INDEX "debt_client_id_idx" ON "debt" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "debt_type_idx" ON "debt" USING btree ("type");