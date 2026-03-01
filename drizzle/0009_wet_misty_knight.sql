CREATE TABLE "d2c_resume_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "d2c_resume_link_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "d2c_resume_link" ADD CONSTRAINT "d2c_resume_link_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "d2c_resume_link" ADD CONSTRAINT "d2c_resume_link_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "d2c_resume_link_user_id_idx" ON "d2c_resume_link" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "d2c_resume_link_client_id_idx" ON "d2c_resume_link" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "d2c_resume_link_expires_at_idx" ON "d2c_resume_link" USING btree ("expires_at");