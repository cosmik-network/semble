ALTER TABLE "cards" ADD COLUMN "via_card_id" uuid;--> statement-breakpoint
ALTER TABLE "collection_cards" ADD COLUMN "via_card_id" uuid;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_via_card_id_cards_id_fk" FOREIGN KEY ("via_card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_cards" ADD CONSTRAINT "collection_cards_via_card_id_cards_id_fk" FOREIGN KEY ("via_card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;