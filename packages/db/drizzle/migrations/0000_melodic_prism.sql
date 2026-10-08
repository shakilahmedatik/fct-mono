CREATE TYPE "public"."audio_status" AS ENUM('pending', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."digest_status" AS ENUM('pending', 'generated', 'delivered', 'failed');--> statement-breakpoint
CREATE TYPE "public"."feedback_type" AS ENUM('helpful', 'not_helpful', 'too_basic', 'too_advanced');--> statement-breakpoint
CREATE TYPE "public"."item_interaction_action" AS ENUM('open', 'click', 'listen_complete', 'listen_skip', 'telegram_react', 'delivery_failed');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('FREE', 'PRO');--> statement-breakpoint
CREATE TYPE "public"."skill_level" AS ENUM('beginner', 'intermediate', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."story_status" AS ENUM('active', 'closed', 'archived');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user_preference" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"topics" text[] DEFAULT '{"ai","startups","engineering","devops"}' NOT NULL,
	"skill_level" "skill_level" DEFAULT 'intermediate' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"delivery_hour" integer DEFAULT 7 NOT NULL,
	"audio_enabled" boolean DEFAULT true NOT NULL,
	"channel_enabled" boolean DEFAULT true NOT NULL,
	"embedding_version" integer DEFAULT 0 NOT NULL,
	"last_personalization_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_preference_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"plan" "plan" DEFAULT 'PRO' NOT NULL,
	"persona" text,
	"telegram_chat_id" text,
	"telegram_username" text,
	"phone_number" text,
	"preferred_delivery_channel" text DEFAULT 'telegram' NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"paddle_customer_id" text,
	"paddle_subscription_id" text,
	"subscription_status" text DEFAULT 'trialing',
	"trial_started_at" timestamp with time zone DEFAULT now(),
	"trial_ends_at" timestamp with time zone,
	"trial_ended_email_sent_at" timestamp with time zone,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audio_brief" (
	"id" text PRIMARY KEY NOT NULL,
	"digest_id" text NOT NULL,
	"status" "audio_status" DEFAULT 'pending' NOT NULL,
	"script" text,
	"audio_url" text,
	"duration_sec" integer,
	"provider" text,
	"delivery_channel" text,
	"delivery_status" text,
	"delivery_message_id" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audio_brief_digest_id_unique" UNIQUE("digest_id")
);
--> statement-breakpoint
CREATE TABLE "digest_item" (
	"id" text PRIMARY KEY NOT NULL,
	"digest_id" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"source" text NOT NULL,
	"summary" text,
	"why_it_matters" text,
	"rank_score" real,
	"position" integer NOT NULL,
	"topics" text[] DEFAULT '{}' NOT NULL,
	"published_at" timestamp with time zone,
	"story_id" text,
	"story_rank" real,
	"is_follow_up" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "digest" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"digest_type" text DEFAULT 'daily_audio' NOT NULL,
	"status" "digest_status" DEFAULT 'pending' NOT NULL,
	"title" text,
	"digest_date" timestamp with time zone DEFAULT now() NOT NULL,
	"generated_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cohort_key" text,
	"is_master" boolean DEFAULT false NOT NULL,
	"personalize_ranker" text,
	"degraded" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story" (
	"id" text PRIMARY KEY NOT NULL,
	"canonical_title" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cluster_id" text,
	"dominant_source" text,
	"status" "story_status" DEFAULT 'active' NOT NULL,
	"embedding_model" text,
	"embedding" "bytea",
	"embedding_dim" integer,
	"topics" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_membership" (
	"id" text PRIMARY KEY NOT NULL,
	"story_id" text NOT NULL,
	"source_item_id" text NOT NULL,
	"source" text NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"content_hash" text,
	"published_at" timestamp with time zone,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_follow_up" boolean DEFAULT false NOT NULL,
	"rank_score" real,
	"upvotes" integer,
	"comments" integer,
	"topics" text[] DEFAULT '{}' NOT NULL,
	CONSTRAINT "story_membership_source_item_id_unique" UNIQUE("source_item_id")
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"digest_id" text,
	"digest_item_id" text,
	"story_membership_id" text,
	"type" "feedback_type" NOT NULL,
	"weight" real DEFAULT 1,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_interaction" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"story_membership_id" text,
	"source_item_id" text,
	"action" "item_interaction_action" NOT NULL,
	"weight" real DEFAULT 1 NOT NULL,
	"listened_seconds" integer,
	"digest_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_post" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"content_html" text NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"digest_date" timestamp with time zone DEFAULT now() NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_post_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "contact_message" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"subject" text,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscriber" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"unsubscribe_token" text NOT NULL,
	"subscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_emailed_at" timestamp with time zone,
	CONSTRAINT "newsletter_subscriber_email_unique" UNIQUE("email"),
	CONSTRAINT "newsletter_subscriber_unsubscribe_token_unique" UNIQUE("unsubscribe_token")
);
--> statement-breakpoint
CREATE TABLE "system_setting" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio_brief" ADD CONSTRAINT "audio_brief_digest_id_digest_id_fk" FOREIGN KEY ("digest_id") REFERENCES "public"."digest"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digest_item" ADD CONSTRAINT "digest_item_digest_id_digest_id_fk" FOREIGN KEY ("digest_id") REFERENCES "public"."digest"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digest_item" ADD CONSTRAINT "digest_item_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digest" ADD CONSTRAINT "digest_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_membership" ADD CONSTRAINT "story_membership_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_digest_id_digest_id_fk" FOREIGN KEY ("digest_id") REFERENCES "public"."digest"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_digest_item_id_digest_item_id_fk" FOREIGN KEY ("digest_item_id") REFERENCES "public"."digest_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_story_membership_id_story_membership_id_fk" FOREIGN KEY ("story_membership_id") REFERENCES "public"."story_membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_interaction" ADD CONSTRAINT "item_interaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_interaction" ADD CONSTRAINT "item_interaction_story_membership_id_story_membership_id_fk" FOREIGN KEY ("story_membership_id") REFERENCES "public"."story_membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_idx" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_idx" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "user_preference_user_id_idx" ON "user_preference" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_telegram_chat_id_idx" ON "user" USING btree ("telegram_chat_id");--> statement-breakpoint
CREATE INDEX "user_paddle_customer_id_idx" ON "user" USING btree ("paddle_customer_id");--> statement-breakpoint
CREATE INDEX "user_paddle_subscription_id_idx" ON "user" USING btree ("paddle_subscription_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "digest_item_digest_id_position_idx" ON "digest_item" USING btree ("digest_id","position");--> statement-breakpoint
CREATE INDEX "digest_item_story_id_idx" ON "digest_item" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "digest_item_url_idx" ON "digest_item" USING btree ("url");--> statement-breakpoint
CREATE INDEX "digest_user_id_digest_date_idx" ON "digest" USING btree ("user_id","digest_date");--> statement-breakpoint
CREATE INDEX "digest_digest_date_idx" ON "digest" USING btree ("digest_date");--> statement-breakpoint
CREATE INDEX "digest_status_idx" ON "digest" USING btree ("status");--> statement-breakpoint
CREATE INDEX "digest_cohort_key_idx" ON "digest" USING btree ("cohort_key");--> statement-breakpoint
CREATE INDEX "digest_cohort_key_digest_date_idx" ON "digest" USING btree ("cohort_key","digest_date");--> statement-breakpoint
CREATE INDEX "story_status_last_seen_idx" ON "story" USING btree ("status","last_seen_at");--> statement-breakpoint
CREATE INDEX "story_dominant_source_idx" ON "story" USING btree ("dominant_source");--> statement-breakpoint
CREATE UNIQUE INDEX "story_membership_source_item_id_idx" ON "story_membership" USING btree ("source_item_id");--> statement-breakpoint
CREATE INDEX "story_membership_story_id_ingested_idx" ON "story_membership" USING btree ("story_id","ingested_at");--> statement-breakpoint
CREATE INDEX "story_membership_content_hash_idx" ON "story_membership" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "feedback_user_id_created_at_idx" ON "feedback" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "feedback_digest_id_idx" ON "feedback" USING btree ("digest_id");--> statement-breakpoint
CREATE INDEX "feedback_digest_item_id_idx" ON "feedback" USING btree ("digest_item_id");--> statement-breakpoint
CREATE INDEX "item_interaction_user_id_created_at_idx" ON "item_interaction" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "item_interaction_story_membership_id_idx" ON "item_interaction" USING btree ("story_membership_id");--> statement-breakpoint
CREATE INDEX "item_interaction_action_created_at_idx" ON "item_interaction" USING btree ("action","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "blog_post_slug_idx" ON "blog_post" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "blog_post_published_at_idx" ON "blog_post" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "blog_post_digest_date_idx" ON "blog_post" USING btree ("digest_date");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_subscriber_email_idx" ON "newsletter_subscriber" USING btree ("email");--> statement-breakpoint
CREATE INDEX "newsletter_subscriber_status_idx" ON "newsletter_subscriber" USING btree ("status");