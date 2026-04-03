CREATE TYPE "public"."letter_job_status" AS ENUM('queued', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "letter_generation_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"status" "letter_job_status" DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"prompt" text NOT NULL,
	"model" text NOT NULL,
	"result_letter" text,
	"result_generated_at" timestamp with time zone,
	"error_code" text,
	"error_message" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "letter_generation_job" ADD CONSTRAINT "letter_generation_job_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letter_generation_job" ADD CONSTRAINT "letter_generation_job_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "letter_generation_job_status_idx" ON "letter_generation_job" USING btree ("status");--> statement-breakpoint
CREATE INDEX "letter_generation_job_client_id_idx" ON "letter_generation_job" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "letter_generation_job_user_id_idx" ON "letter_generation_job" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "letter_generation_job_status_requested_at_idx" ON "letter_generation_job" USING btree ("status","requested_at");