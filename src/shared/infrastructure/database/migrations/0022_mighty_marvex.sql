CREATE TABLE "firehose_cursors" (
	"id" text PRIMARY KEY NOT NULL,
	"time_us" bigint NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
