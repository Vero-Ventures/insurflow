CREATE TYPE "public"."communication_preference" AS ENUM('email', 'phone', 'sms');--> statement-breakpoint
CREATE TYPE "public"."household_status" AS ENUM('single', 'partnered', 'family');--> statement-breakpoint
CREATE TYPE "public"."primary_goal" AS ENUM('family_protection', 'debt_coverage', 'retirement_security', 'estate_planning');--> statement-breakpoint
ALTER TABLE "user_profile" ALTER COLUMN "household_status" SET DATA TYPE "public"."household_status" USING "household_status"::"public"."household_status";--> statement-breakpoint
ALTER TABLE "user_profile" ALTER COLUMN "primary_goal" SET DATA TYPE "public"."primary_goal" USING "primary_goal"::"public"."primary_goal";--> statement-breakpoint
ALTER TABLE "user_profile" ALTER COLUMN "communication_preference" SET DATA TYPE "public"."communication_preference" USING "communication_preference"::"public"."communication_preference";