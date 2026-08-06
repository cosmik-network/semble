CREATE TABLE "onboarding_state" (
	"user_id" text PRIMARY KEY NOT NULL,
	"onboarding_completed" boolean,
	"topics_selected" text[],
	"links_suggested" text[],
	"links_selected" text[],
	"suggested_accounts" text[],
	"suggested_collections" text[],
	"followed_accounts" text[],
	"followed_collections" text[],
	"first_cards" text[],
	"first_collection" text,
	"first_connection" text,
	"pwa_installed" timestamp with time zone,
	"ios_shortcut_installed" timestamp with time zone,
	"browser_extension_installed" timestamp with time zone,
	"save_modal_guide_completed" timestamp with time zone,
	"connection_creation_modal_completed" timestamp with time zone,
	"semble_page_navigation_completed" timestamp with time zone,
	"intention" text[],
	"referral_source" text[],
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "onboarding_state" ADD CONSTRAINT "onboarding_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;