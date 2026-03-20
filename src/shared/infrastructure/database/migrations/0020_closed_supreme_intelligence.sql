ALTER TABLE "feed_activities" ADD COLUMN "connection_id" text;--> statement-breakpoint
CREATE INDEX "feed_activities_connection_id_idx" ON "feed_activities" USING btree ("connection_id");