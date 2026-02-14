CREATE TYPE "public"."beneficiary_relationship" AS ENUM('spouse', 'child', 'parent', 'sibling', 'grandchild', 'grandparent', 'trust', 'charity', 'estate', 'business_partner', 'other');--> statement-breakpoint
CREATE TABLE "asset_allocation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"beneficiary_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"desired_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"actual_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beneficiary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"date_of_birth" date,
	"relationship" "beneficiary_relationship" NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "asset_allocation" ADD CONSTRAINT "asset_allocation_beneficiary_id_beneficiary_id_fk" FOREIGN KEY ("beneficiary_id") REFERENCES "public"."beneficiary"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_allocation" ADD CONSTRAINT "asset_allocation_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiary" ADD CONSTRAINT "beneficiary_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_allocation_beneficiary_id_idx" ON "asset_allocation" USING btree ("beneficiary_id");--> statement-breakpoint
CREATE INDEX "asset_allocation_asset_id_idx" ON "asset_allocation" USING btree ("asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "asset_allocation_beneficiary_asset_idx" ON "asset_allocation" USING btree ("beneficiary_id","asset_id");--> statement-breakpoint
CREATE INDEX "beneficiary_client_id_idx" ON "beneficiary" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "beneficiary_relationship_idx" ON "beneficiary" USING btree ("relationship");--> statement-breakpoint
CREATE INDEX "beneficiary_client_id_deleted_at_idx" ON "beneficiary" USING btree ("client_id","deleted_at");
