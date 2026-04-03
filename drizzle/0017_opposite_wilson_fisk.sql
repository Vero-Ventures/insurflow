ALTER TABLE "letter_generation_job" ADD COLUMN "temperature" numeric(3, 2);--> statement-breakpoint
ALTER TABLE "letter_generation_job" ADD COLUMN "max_output_tokens" integer;--> statement-breakpoint
UPDATE "letter_generation_job"
SET
  "temperature" = 0.70,
  "max_output_tokens" = 2048
WHERE "temperature" IS NULL OR "max_output_tokens" IS NULL;--> statement-breakpoint
ALTER TABLE "letter_generation_job" ALTER COLUMN "temperature" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "letter_generation_job" ALTER COLUMN "max_output_tokens" SET NOT NULL;
