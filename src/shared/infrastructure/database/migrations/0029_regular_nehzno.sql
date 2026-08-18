CREATE TABLE "api_request_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_did" text NOT NULL,
	"method" text NOT NULL,
	"endpoint" text NOT NULL,
	"source" text NOT NULL,
	"auth_method" text NOT NULL,
	"status" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "api_request_logs_created_at_idx" ON "api_request_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "api_request_logs_source_created_at_idx" ON "api_request_logs" USING btree ("source","created_at");--> statement-breakpoint
CREATE INDEX "api_request_logs_user_created_at_idx" ON "api_request_logs" USING btree ("user_did","created_at");