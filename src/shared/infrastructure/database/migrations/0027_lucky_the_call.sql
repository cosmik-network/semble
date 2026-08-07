ALTER TABLE "onboarding_state" RENAME COLUMN "onboarding_completed" TO "onboarding_state";--> statement-breakpoint
ALTER TABLE "onboarding_state" RENAME COLUMN "pwa_installed" TO "pwa_clicked";--> statement-breakpoint
ALTER TABLE "onboarding_state" RENAME COLUMN "ios_shortcut_installed" TO "ios_shortcut_clicked";--> statement-breakpoint
ALTER TABLE "onboarding_state" RENAME COLUMN "browser_extension_installed" TO "browser_extension_clicked";--> statement-breakpoint
ALTER TABLE "onboarding_state" ADD COLUMN "mcp_clicked" timestamp with time zone;