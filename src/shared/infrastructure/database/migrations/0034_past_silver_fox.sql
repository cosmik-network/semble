ALTER TABLE "canvases" ADD COLUMN "share_token" text;--> statement-breakpoint
ALTER TABLE "canvases" ADD COLUMN "shared_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "canvases_share_token_idx" ON "canvases" USING btree ("share_token");