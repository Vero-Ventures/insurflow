CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete', 'restore');
CREATE TYPE "public"."audit_entity_type" AS ENUM('client', 'asset', 'debt', 'beneficiary', 'asset_allocation', 'business', 'key_person', 'shareholder', 'corporate_insurance_need', 'policy', 'user_profile');
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "audit_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" "audit_action" NOT NULL,
	"user_id" text,
	"old_values" jsonb,
	"new_values" jsonb,
	"changed_fields" jsonb,
	"ip_address" text,
	"user_agent" text,
	"request_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone NOT NULL
);
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log" USING btree ("entity_type","entity_id");
CREATE INDEX "audit_log_user_id_idx" ON "audit_log" USING btree ("user_id");
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");
CREATE INDEX "audit_log_entity_type_entity_id_created_at_idx" ON "audit_log" USING btree ("entity_type","entity_id","created_at");
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action");
