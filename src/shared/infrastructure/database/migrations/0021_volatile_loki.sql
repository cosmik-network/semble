CREATE INDEX "idx_cards_created_at" ON "cards" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_cards_author_created_at" ON "cards" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_cards_created_at_url_type" ON "cards" USING btree ("created_at","url_type");--> statement-breakpoint
CREATE INDEX "idx_collections_created_at" ON "collections" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_collections_author_created_at" ON "collections" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_collections_created_at_access_type" ON "collections" USING btree ("created_at","access_type");--> statement-breakpoint
CREATE INDEX "idx_connections_created_at_connection_type" ON "connections" USING btree ("created_at","connection_type");--> statement-breakpoint
CREATE INDEX "idx_follows_created_at" ON "follows" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_follows_follower_created_at" ON "follows" USING btree ("follower_id","created_at");