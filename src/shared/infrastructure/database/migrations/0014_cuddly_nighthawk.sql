CREATE TABLE "sync_statuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curator_id" text NOT NULL,
	"sync_state" text NOT NULL,
	"last_synced_at" timestamp,
	"last_sync_attempt_at" timestamp,
	"sync_error_message" text,
	"records_processed" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sync_statuses_curator_id_unique" UNIQUE("curator_id")
);
