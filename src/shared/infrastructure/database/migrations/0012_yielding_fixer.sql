ALTER TABLE "feed_activities" ADD COLUMN "card_id" text;--> statement-breakpoint
CREATE INDEX "feed_activities_dedup_idx" ON "feed_activities" USING btree ("actor_id","card_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "feed_activities_card_id_idx" ON "feed_activities" USING btree ("card_id");