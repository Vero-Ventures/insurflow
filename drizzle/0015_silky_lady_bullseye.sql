DO $$ BEGIN
  CREATE TYPE "public"."chat_role" AS ENUM('user', 'assistant');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_chat_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "chat_role" NOT NULL,
	"content" text NOT NULL,
	"model" text,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"total_tokens" integer,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "client_chat_message" ADD CONSTRAINT "client_chat_message_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "client_chat_message" ADD CONSTRAINT "client_chat_message_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_chat_message_client_id_sent_at_idx" ON "client_chat_message" USING btree ("client_id","sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_chat_message_user_id_sent_at_idx" ON "client_chat_message" USING btree ("user_id","sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_chat_message_client_id_user_id_role_idx" ON "client_chat_message" USING btree ("client_id","user_id","role");