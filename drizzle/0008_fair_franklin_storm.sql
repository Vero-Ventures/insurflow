CREATE TYPE "public"."account_type" AS ENUM('client', 'advisor');--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "account_type" "account_type" DEFAULT 'client' NOT NULL;
