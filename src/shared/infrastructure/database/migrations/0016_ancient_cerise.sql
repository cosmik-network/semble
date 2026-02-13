CREATE TABLE "following_feed_items" (
	"user_id" text NOT NULL,
	"activity_id" uuid NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "following_feed_items_user_id_activity_id_pk" PRIMARY KEY("user_id","activity_id")
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"follower_id" text NOT NULL,
	"target_id" text NOT NULL,
	"target_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "follows_follower_id_target_id_target_type_pk" PRIMARY KEY("follower_id","target_id","target_type")
);
--> statement-breakpoint
ALTER TABLE "following_feed_items" ADD CONSTRAINT "following_feed_items_activity_id_feed_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."feed_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_following_feed_user_time" ON "following_feed_items" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_follows_follower" ON "follows" USING btree ("follower_id");--> statement-breakpoint
CREATE INDEX "idx_follows_target" ON "follows" USING btree ("target_id","target_type");