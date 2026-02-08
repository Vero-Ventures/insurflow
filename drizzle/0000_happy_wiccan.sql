DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_type') THEN
        CREATE TYPE "public"."asset_type" AS ENUM('401k', '403b', 'ira_traditional', 'ira_roth', 'sep_ira', 'simple_ira', 'brokerage', 'hsa', '529_plan', 'real_estate', 'life_insurance', 'business_interest', 'pension', 'stock_options', 'cryptocurrency', 'collectibles', 'savings', 'other');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_status') THEN
        CREATE TYPE "public"."client_status" AS ENUM('draft', 'active', 'archived');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'debt_type') THEN
        CREATE TYPE "public"."debt_type" AS ENUM('mortgage', 'heloc', 'car_loan', 'student_loan', 'personal_loan', 'credit_card', 'line_of_credit', 'business_loan', 'other');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'health_rating') THEN
        CREATE TYPE "public"."health_rating" AS ENUM('preferred_plus', 'preferred', 'standard_plus', 'standard', 'substandard');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sex') THEN
        CREATE TYPE "public"."sex" AS ENUM('M', 'F');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'state') THEN
        CREATE TYPE "public"."state" AS ENUM('AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC');
    END IF;
END$$;--> statement-breakpoint
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
	"additional_goals" text,
	"status" "client_status" DEFAULT 'draft' NOT NULL,
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
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client" ADD CONSTRAINT "client_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt" ADD CONSTRAINT "debt_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_idx" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "asset_client_id_idx" ON "asset" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "asset_type_idx" ON "asset" USING btree ("type");--> statement-breakpoint
CREATE INDEX "asset_client_id_deleted_at_idx" ON "asset" USING btree ("client_id","deleted_at");--> statement-breakpoint
CREATE INDEX "client_user_id_idx" ON "client" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "client_status_idx" ON "client" USING btree ("status");--> statement-breakpoint
CREATE INDEX "client_deleted_at_idx" ON "client" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "client_user_id_deleted_at_idx" ON "client" USING btree ("user_id","deleted_at");--> statement-breakpoint
CREATE INDEX "debt_client_id_idx" ON "debt" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "debt_type_idx" ON "debt" USING btree ("type");--> statement-breakpoint
CREATE INDEX "debt_client_id_deleted_at_idx" ON "debt" USING btree ("client_id","deleted_at");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");