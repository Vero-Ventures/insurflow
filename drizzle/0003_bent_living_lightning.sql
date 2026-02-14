CREATE TYPE "public"."business_type" AS ENUM('corporation', 'partnership', 'sole_proprietorship', 'trust', 'other');--> statement-breakpoint
CREATE TYPE "public"."insurance_need_type" AS ENUM('key_person', 'buy_sell', 'debt_coverage', 'succession', 'other');--> statement-breakpoint
CREATE TABLE "business" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "business_type" NOT NULL,
	"valuation" numeric(14, 2) DEFAULT '0' NOT NULL,
	"fiscal_year_end" date,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "corporate_insurance_need" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"insurance_type" "insurance_need_type" NOT NULL,
	"coverage_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "key_person" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"compensation" numeric(14, 2) DEFAULT '0' NOT NULL,
	"ownership_percentage" numeric(5, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "shareholder" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"ownership_percentage" numeric(5, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "shareholder_ownership_pct_range" CHECK ("shareholder"."ownership_percentage" >= 0 AND "shareholder"."ownership_percentage" <= 100)
);
--> statement-breakpoint
ALTER TABLE "business" ADD CONSTRAINT "business_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_insurance_need" ADD CONSTRAINT "corporate_insurance_need_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_person" ADD CONSTRAINT "key_person_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shareholder" ADD CONSTRAINT "shareholder_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_client_id_idx" ON "business" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "business_type_idx" ON "business" USING btree ("type");--> statement-breakpoint
CREATE INDEX "business_client_id_deleted_at_idx" ON "business" USING btree ("client_id","deleted_at");--> statement-breakpoint
CREATE INDEX "corporate_insurance_need_business_id_idx" ON "corporate_insurance_need" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "corporate_insurance_need_type_idx" ON "corporate_insurance_need" USING btree ("insurance_type");--> statement-breakpoint
CREATE INDEX "corporate_insurance_need_business_id_deleted_at_idx" ON "corporate_insurance_need" USING btree ("business_id","deleted_at");--> statement-breakpoint
CREATE INDEX "key_person_business_id_idx" ON "key_person" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "key_person_business_id_deleted_at_idx" ON "key_person" USING btree ("business_id","deleted_at");--> statement-breakpoint
CREATE INDEX "shareholder_business_id_idx" ON "shareholder" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "shareholder_business_id_deleted_at_idx" ON "shareholder" USING btree ("business_id","deleted_at");