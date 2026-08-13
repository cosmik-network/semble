-- Custom SQL migration file, put your code below! --

-- 0027 renamed onboarding_completed -> onboarding_state but drizzle-kit's differ
-- matched the columns as a rename, which consumed the pairing before the type-diff
-- pass ran, so the boolean -> text change was never emitted. Its snapshot already
-- records "text", so a normal `db:generate` sees no delta and cannot fix this.
--
-- The table is empty in every environment, so prior values are dropped to NULL
-- ("no state recorded yet"). Both CASE branches evaluate to NULL by design; the
-- CASE is kept so the statement stays valid if a row lands before deploy.

ALTER TABLE "onboarding_state"
ALTER COLUMN "onboarding_state"
DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "onboarding_state"
ALTER COLUMN "onboarding_state" TYPE text USING (
    CASE
        WHEN "onboarding_state" IS NULL THEN NULL
        ELSE NULL
    END
);