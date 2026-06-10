ALTER TABLE "follows" ADD COLUMN "is_subscribed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "follows" ADD COLUMN "subscribed_at" timestamp;--> statement-breakpoint
CREATE INDEX "idx_follows_follower_subscribed" ON "follows" USING btree ("follower_id","is_subscribed","subscribed_at");