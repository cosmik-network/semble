CREATE TABLE "canvases" (
    "id" uuid PRIMARY KEY NOT NULL,
    "owner_did" text NOT NULL,
    "name" text NOT NULL,
    "tldraw_version" text NOT NULL,
    "link_count" integer DEFAULT 0 NOT NULL,
    "revision" integer DEFAULT 0 NOT NULL,
    "schema_sequences" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "document_key" text,
    "has_thumbnail" boolean DEFAULT false NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "canvases_owner_idx" ON "canvases" USING btree ("owner_did");
--> statement-breakpoint
CREATE INDEX "canvases_owner_updated_idx" ON "canvases" USING btree (
    "owner_did",
    "updated_at" DESC NULLS LAST
);