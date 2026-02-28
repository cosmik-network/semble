CREATE TABLE "connections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"curator_id" text NOT NULL,
	"source_type" text NOT NULL,
	"source_value" text NOT NULL,
	"target_type" text NOT NULL,
	"target_value" text NOT NULL,
	"connection_type" text,
	"note" text,
	"published_record_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_published_record_id_published_records_id_fk" FOREIGN KEY ("published_record_id") REFERENCES "public"."published_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "connections_curator_id_idx" ON "connections" USING btree ("curator_id");--> statement-breakpoint
CREATE INDEX "connections_source_idx" ON "connections" USING btree ("source_type","source_value");--> statement-breakpoint
CREATE INDEX "connections_target_idx" ON "connections" USING btree ("target_type","target_value");--> statement-breakpoint
CREATE INDEX "connections_created_at_idx" ON "connections" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "connections_curator_created_at_idx" ON "connections" USING btree ("curator_id","created_at" DESC NULLS LAST);