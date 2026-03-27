CREATE TABLE "estimate_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"run_number" integer NOT NULL,
	"recommended_coverage" numeric(14, 2) NOT NULL,
	"premium_low" numeric(10, 2) NOT NULL,
	"premium_high" numeric(10, 2) NOT NULL,
	"term_years" integer NOT NULL,
	"province" "state" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "estimate_run" ADD CONSTRAINT "estimate_run_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimate_run" ADD CONSTRAINT "estimate_run_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "estimate_run_client_id_idx" ON "estimate_run" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "estimate_run_user_id_idx" ON "estimate_run" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "estimate_run_client_run_number_uidx" ON "estimate_run" USING btree ("client_id","run_number");