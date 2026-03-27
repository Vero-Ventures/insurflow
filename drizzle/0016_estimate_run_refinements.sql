ALTER TABLE "assumption_version" ALTER COLUMN "effective_from" SET DATA TYPE date USING "effective_from"::date;
--> statement-breakpoint
ALTER TABLE "assumption_version" ALTER COLUMN "effective_to" SET DATA TYPE date USING "effective_to"::date;
--> statement-breakpoint
ALTER TABLE "assumption_version" ADD CONSTRAINT "assumption_version_product_line_label_unique" UNIQUE("product_line","version_label");
--> statement-breakpoint
ALTER TABLE "estimate_run" ADD CONSTRAINT "estimate_run_client_id_run_number_unique" UNIQUE("client_id","run_number");
