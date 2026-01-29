ALTER TABLE "feed_activities" ADD COLUMN "source" text;--> statement-breakpoint
CREATE INDEX "feed_activities_source_idx" ON "feed_activities" USING btree ("source");