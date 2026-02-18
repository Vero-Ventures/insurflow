CREATE TABLE "user_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"state" "state" NOT NULL,
	"household_status" text NOT NULL,
	"primary_goal" text NOT NULL,
	"communication_preference" text NOT NULL,
	"onboarding_completed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_profile_state_idx" ON "user_profile" USING btree ("state");--> statement-breakpoint
CREATE INDEX "user_profile_primary_goal_idx" ON "user_profile" USING btree ("primary_goal");