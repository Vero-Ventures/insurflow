ALTER TABLE "client" ADD COLUMN "retirement_age" integer;--> statement-breakpoint
ALTER TABLE "client" ADD COLUMN "youngest_child_age" integer;--> statement-breakpoint
ALTER TABLE "client" ADD COLUMN "gov_survivor_benefit" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "client" ADD COLUMN "investment_income" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "client" ADD COLUMN "other_income" numeric(14, 2) DEFAULT '0' NOT NULL;