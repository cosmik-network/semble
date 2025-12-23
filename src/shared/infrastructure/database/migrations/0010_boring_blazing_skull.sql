ALTER TABLE "cards" ADD COLUMN "url_type" text;--> statement-breakpoint
CREATE INDEX "idx_cards_url_type_filter" ON "cards" USING btree ("url_type");