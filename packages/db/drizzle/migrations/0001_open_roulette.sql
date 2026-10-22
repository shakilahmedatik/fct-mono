ALTER TABLE "user" ALTER COLUMN "plan" SET DEFAULT 'FREE';--> statement-breakpoint
UPDATE "user" SET "subscription_status" = 'trialing' WHERE "subscription_status" IS NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "subscription_status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preference" ADD COLUMN "delivery_cadence" text DEFAULT 'daily' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preference" ADD COLUMN "voice_persona" text DEFAULT 'neutral' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preference" ADD COLUMN "playback_speed" real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preference" ADD COLUMN "email_digest" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preference" ADD COLUMN "email_alerts" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "item_interaction" ADD CONSTRAINT "item_interaction_digest_id_digest_id_fk" FOREIGN KEY ("digest_id") REFERENCES "public"."digest"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "item_interaction_digest_id_idx" ON "item_interaction" USING btree ("digest_id");--> statement-breakpoint
ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_playback_speed_check" CHECK ("user_preference"."playback_speed" >= 0.5 and "user_preference"."playback_speed" <= 2.0);