CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete', 'restore');--> statement-breakpoint
CREATE TYPE "public"."audit_entity_type" AS ENUM('client', 'asset', 'debt', 'beneficiary', 'asset_allocation', 'business', 'key_person', 'shareholder', 'corporate_insurance_need', 'policy', 'user_profile', 'application', 'application_event');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('client', 'advisor');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('draft', 'submitted', 'received', 'in_review', 'additional_info_requested', 'approved', 'declined');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('401k', '403b', 'ira_traditional', 'ira_roth', 'sep_ira', 'simple_ira', 'brokerage', 'hsa', '529_plan', 'real_estate', 'life_insurance', 'business_interest', 'pension', 'stock_options', 'cryptocurrency', 'collectibles', 'savings', 'other');--> statement-breakpoint
CREATE TYPE "public"."beneficiary_relationship" AS ENUM('spouse', 'child', 'parent', 'sibling', 'grandchild', 'grandparent', 'trust', 'charity', 'estate', 'business_partner', 'other');--> statement-breakpoint
CREATE TYPE "public"."business_type" AS ENUM('corporation', 'partnership', 'sole_proprietorship', 'trust', 'other');--> statement-breakpoint
CREATE TYPE "public"."client_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."communication_preference" AS ENUM('email', 'phone', 'sms');--> statement-breakpoint
CREATE TYPE "public"."debt_type" AS ENUM('mortgage', 'heloc', 'car_loan', 'student_loan', 'personal_loan', 'credit_card', 'line_of_credit', 'business_loan', 'other');--> statement-breakpoint
CREATE TYPE "public"."health_rating" AS ENUM('preferred_plus', 'preferred', 'standard_plus', 'standard', 'substandard');--> statement-breakpoint
CREATE TYPE "public"."household_status" AS ENUM('single', 'partnered', 'family');--> statement-breakpoint
CREATE TYPE "public"."insurance_need_type" AS ENUM('key_person', 'buy_sell', 'debt_coverage', 'succession', 'other');--> statement-breakpoint
CREATE TYPE "public"."life_event_type" AS ENUM('income_change', 'new_child', 'debt_change', 'marriage', 'divorce');--> statement-breakpoint
CREATE TYPE "public"."policy_status" AS ENUM('active', 'lapsed', 'surrendered', 'paid_up', 'pending');--> statement-breakpoint
CREATE TYPE "public"."policy_type" AS ENUM('term_life', 'whole_life', 'universal_life', 'variable_life', 'group_life', 'other');--> statement-breakpoint
CREATE TYPE "public"."primary_goal" AS ENUM('family_protection', 'debt_coverage', 'retirement_security', 'estate_planning');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('M', 'F');--> statement-breakpoint
CREATE TYPE "public"."state" AS ENUM('AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC', 'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT');--> statement-breakpoint
CREATE TABLE "application" (
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
CREATE TABLE "application_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"status" "application_status" NOT NULL,
	"source" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "audit_entity_type" NOT NULL,
	"entity_id" text NOT NULL,
	"action" "audit_action" NOT NULL,
	"user_id" text,
	"old_values" jsonb,
	"new_values" jsonb,
	"changed_fields" jsonb,
	"ip_address" text,
	"user_agent" text,
	"request_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
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
CREATE TABLE "client" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"sex" "sex" NOT NULL,
	"state" "state" NOT NULL,
	"smoker" boolean DEFAULT false NOT NULL,
	"health_rating" "health_rating" DEFAULT 'standard' NOT NULL,
	"has_spouse" boolean DEFAULT false NOT NULL,
	"spouse_age" integer,
	"client_income" numeric(14, 2) DEFAULT '0' NOT NULL,
	"spouse_income" numeric(14, 2),
	"income_replacement_percent" numeric(5, 2) DEFAULT '70' NOT NULL,
	"replacement_duration_years" integer DEFAULT 10 NOT NULL,
	"existing_life_insurance_coverage" numeric(14, 2) DEFAULT '0' NOT NULL,
	"retirement_age" integer,
	"youngest_child_age" integer,
	"gov_survivor_benefit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"investment_income" numeric(14, 2) DEFAULT '0' NOT NULL,
	"other_income" numeric(14, 2) DEFAULT '0' NOT NULL,
	"additional_goals" text,
	"consent_transmit_to_carrier_at" timestamp with time zone,
	"health_info_authorization_at" timestamp with time zone,
	"esign_intent_acknowledged_at" timestamp with time zone,
	"status" "client_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
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
CREATE TABLE "d2c_resume_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "d2c_resume_link_token_unique" UNIQUE("token")
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
CREATE TABLE "life_event_recalculation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"life_event" "life_event_type" NOT NULL,
	"notes" text,
	"triggered_at" timestamp with time zone NOT NULL,
	"before_snapshot" jsonb NOT NULL,
	"after_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "user_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"state" "state" NOT NULL,
	"household_status" "household_status" NOT NULL,
	"primary_goal" "primary_goal" NOT NULL,
	"communication_preference" "communication_preference" NOT NULL,
	"account_type" "account_type" DEFAULT 'client' NOT NULL,
	"onboarding_completed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_event" (
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
ALTER TABLE "application" ADD CONSTRAINT "application_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_event" ADD CONSTRAINT "application_event_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_allocation" ADD CONSTRAINT "asset_allocation_beneficiary_id_beneficiary_id_fk" FOREIGN KEY ("beneficiary_id") REFERENCES "public"."beneficiary"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_allocation" ADD CONSTRAINT "asset_allocation_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiary" ADD CONSTRAINT "beneficiary_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client" ADD CONSTRAINT "client_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business" ADD CONSTRAINT "business_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_insurance_need" ADD CONSTRAINT "corporate_insurance_need_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_person" ADD CONSTRAINT "key_person_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shareholder" ADD CONSTRAINT "shareholder_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "d2c_resume_link" ADD CONSTRAINT "d2c_resume_link_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "d2c_resume_link" ADD CONSTRAINT "d2c_resume_link_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt" ADD CONSTRAINT "debt_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "life_event_recalculation" ADD CONSTRAINT "life_event_recalculation_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "life_event_recalculation" ADD CONSTRAINT "life_event_recalculation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy" ADD CONSTRAINT "policy_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_event" ADD CONSTRAINT "webhook_event_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_client_id_idx" ON "application" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "application_user_id_idx" ON "application" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "application_status_idx" ON "application" USING btree ("status");--> statement-breakpoint
CREATE INDEX "application_client_id_deleted_at_idx" ON "application" USING btree ("client_id","deleted_at");--> statement-breakpoint
CREATE INDEX "application_event_application_id_idx" ON "application_event" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "application_event_status_idx" ON "application_event" USING btree ("status");--> statement-breakpoint
CREATE INDEX "application_event_occurred_at_idx" ON "application_event" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "asset_client_id_idx" ON "asset" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "asset_type_idx" ON "asset" USING btree ("type");--> statement-breakpoint
CREATE INDEX "asset_client_id_deleted_at_idx" ON "asset" USING btree ("client_id","deleted_at");--> statement-breakpoint
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_user_id_idx" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_log_entity_type_entity_id_created_at_idx" ON "audit_log" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_idx" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "asset_allocation_beneficiary_id_idx" ON "asset_allocation" USING btree ("beneficiary_id");--> statement-breakpoint
CREATE INDEX "asset_allocation_asset_id_idx" ON "asset_allocation" USING btree ("asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "asset_allocation_beneficiary_asset_idx" ON "asset_allocation" USING btree ("beneficiary_id","asset_id");--> statement-breakpoint
CREATE INDEX "beneficiary_client_id_idx" ON "beneficiary" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "beneficiary_relationship_idx" ON "beneficiary" USING btree ("relationship");--> statement-breakpoint
CREATE INDEX "beneficiary_client_id_deleted_at_idx" ON "beneficiary" USING btree ("client_id","deleted_at");--> statement-breakpoint
CREATE INDEX "client_user_id_idx" ON "client" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "client_status_idx" ON "client" USING btree ("status");--> statement-breakpoint
CREATE INDEX "client_deleted_at_idx" ON "client" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "client_user_id_deleted_at_idx" ON "client" USING btree ("user_id","deleted_at");--> statement-breakpoint
CREATE INDEX "business_client_id_idx" ON "business" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "business_type_idx" ON "business" USING btree ("type");--> statement-breakpoint
CREATE INDEX "business_client_id_deleted_at_idx" ON "business" USING btree ("client_id","deleted_at");--> statement-breakpoint
CREATE INDEX "corporate_insurance_need_business_id_idx" ON "corporate_insurance_need" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "corporate_insurance_need_type_idx" ON "corporate_insurance_need" USING btree ("insurance_type");--> statement-breakpoint
CREATE INDEX "corporate_insurance_need_business_id_deleted_at_idx" ON "corporate_insurance_need" USING btree ("business_id","deleted_at");--> statement-breakpoint
CREATE INDEX "key_person_business_id_idx" ON "key_person" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "key_person_business_id_deleted_at_idx" ON "key_person" USING btree ("business_id","deleted_at");--> statement-breakpoint
CREATE INDEX "shareholder_business_id_idx" ON "shareholder" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "shareholder_business_id_deleted_at_idx" ON "shareholder" USING btree ("business_id","deleted_at");--> statement-breakpoint
CREATE INDEX "d2c_resume_link_user_id_idx" ON "d2c_resume_link" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "d2c_resume_link_client_id_idx" ON "d2c_resume_link" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "d2c_resume_link_expires_at_idx" ON "d2c_resume_link" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "debt_client_id_idx" ON "debt" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "debt_type_idx" ON "debt" USING btree ("type");--> statement-breakpoint
CREATE INDEX "debt_client_id_deleted_at_idx" ON "debt" USING btree ("client_id","deleted_at");--> statement-breakpoint
CREATE INDEX "life_event_recalculation_client_id_idx" ON "life_event_recalculation" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "life_event_recalculation_triggered_at_idx" ON "life_event_recalculation" USING btree ("triggered_at");--> statement-breakpoint
CREATE INDEX "policy_client_id_idx" ON "policy" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "policy_type_idx" ON "policy" USING btree ("type");--> statement-breakpoint
CREATE INDEX "policy_status_idx" ON "policy" USING btree ("status");--> statement-breakpoint
CREATE INDEX "policy_client_id_deleted_at_idx" ON "policy" USING btree ("client_id","deleted_at");--> statement-breakpoint
CREATE INDEX "user_profile_state_idx" ON "user_profile" USING btree ("state");--> statement-breakpoint
CREATE INDEX "user_profile_primary_goal_idx" ON "user_profile" USING btree ("primary_goal");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_event_provider_event_id_uniq" ON "webhook_event" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "webhook_event_client_id_event_timestamp_idx" ON "webhook_event" USING btree ("client_id","event_timestamp");--> statement-breakpoint
CREATE INDEX "webhook_event_provider_idx" ON "webhook_event" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "webhook_event_status_idx" ON "webhook_event" USING btree ("status");