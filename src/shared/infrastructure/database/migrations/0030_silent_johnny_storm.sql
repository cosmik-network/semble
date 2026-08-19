DROP INDEX "notifications_recipient_read_idx";
--> statement-breakpoint
DROP INDEX "idx_follows_target";
--> statement-breakpoint
CREATE INDEX "idx_cards_published_record_id" ON "cards" USING btree ("published_record_id")
WHERE
    published_record_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "idx_collection_cards_published_record_id" ON "collection_cards" USING btree ("published_record_id")
WHERE
    published_record_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "idx_collections_published_record_id" ON "collections" USING btree ("published_record_id")
WHERE
    published_record_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "idx_connections_published_record_id" ON "connections" USING btree ("published_record_id")
WHERE
    published_record_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "idx_library_memberships_published_record_id" ON "library_memberships" USING btree ("published_record_id")
WHERE
    published_record_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "notifications_recipient_unread_partial_idx" ON "notifications" USING btree ("recipient_user_id")
WHERE
    read = false;
--> statement-breakpoint
CREATE INDEX "notifications_actor_idx" ON "notifications" USING btree ("actor_user_id");
--> statement-breakpoint
CREATE INDEX "notifications_metadata_card_id_idx" ON "notifications" USING btree ((metadata ->> 'cardId'));
--> statement-breakpoint
-- Collapse pre-existing duplicate refresh tokens before enforcing uniqueness.
-- Historic refresh tokens were signed JWTs whose payload was {type,iat,exp}
-- only, carrying no user or nonce claim, so refreshes landing in the same
-- second produced byte-identical token strings. Such rows are ambiguous (they
-- cannot be attributed to a single user), so every member of a duplicate group
-- is revoked, then all but one row per group is removed.
UPDATE "auth_refresh_tokens"
SET
    "revoked" = true
WHERE
    "refresh_token" IN (
        SELECT "refresh_token"
        FROM "auth_refresh_tokens"
        GROUP BY
            "refresh_token"
        HAVING
            count(*) > 1
    );
--> statement-breakpoint
DELETE FROM "auth_refresh_tokens" a USING "auth_refresh_tokens" b
WHERE
    a."refresh_token" = b."refresh_token"
    AND a."token_id" > b."token_id";
--> statement-breakpoint
CREATE UNIQUE INDEX "auth_refresh_tokens_refresh_token_idx" ON "auth_refresh_tokens" USING btree ("refresh_token");
--> statement-breakpoint
CREATE INDEX "idx_follows_target_created_at" ON "follows" USING btree (
    "target_id",
    "target_type",
    "created_at" DESC NULLS LAST
);
--> statement-breakpoint
CREATE INDEX "idx_follows_published_record_id" ON "follows" USING btree ("published_record_id")
WHERE
    published_record_id IS NOT NULL;