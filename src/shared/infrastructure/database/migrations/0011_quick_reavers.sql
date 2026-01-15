ALTER TABLE "feed_activities" ADD COLUMN "url_type" text;--> statement-breakpoint
CREATE INDEX "feed_activities_type_idx" ON "feed_activities" USING btree ("type");--> statement-breakpoint
CREATE INDEX "feed_activities_url_type_idx" ON "feed_activities" USING btree ("url_type");--> statement-breakpoint
CREATE INDEX "feed_activities_created_at_idx" ON "feed_activities" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "feed_activities_type_created_at_idx" ON "feed_activities" USING btree ("type","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "feed_activities_url_type_created_at_idx" ON "feed_activities" USING btree ("url_type","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "feed_activities_type_url_type_created_at_idx" ON "feed_activities" USING btree ("type","url_type","created_at" DESC NULLS LAST);