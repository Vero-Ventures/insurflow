DROP INDEX IF EXISTS "d2c_resume_link_token_idx";--> statement-breakpoint
ALTER TABLE "client" ADD COLUMN "consent_transmit_to_carrier_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "client" ADD COLUMN "health_info_authorization_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "client" ADD COLUMN "esign_intent_acknowledged_at" timestamp with time zone;