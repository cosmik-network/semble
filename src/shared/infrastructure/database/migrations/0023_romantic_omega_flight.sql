CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"user_did" text NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"revoked" boolean DEFAULT false NOT NULL,
	CONSTRAINT "api_keys_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_did_users_id_fk" FOREIGN KEY ("user_did") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_user_did_idx" ON "api_keys" USING btree ("user_did");--> statement-breakpoint
CREATE INDEX "api_keys_token_hash_idx" ON "api_keys" USING btree ("token_hash");