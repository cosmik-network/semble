import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { users } from './user.sql';

export const onboardingState = pgTable('onboarding_state', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id),
  onboardingCompleted: boolean('onboarding_completed'),
  topicsSelected: text('topics_selected').array(),
  linksSuggested: text('links_suggested').array(),
  linksSelected: text('links_selected').array(),
  suggestedAccounts: text('suggested_accounts').array(),
  suggestedCollections: text('suggested_collections').array(),
  followedAccounts: text('followed_accounts').array(),
  followedCollections: text('followed_collections').array(),
  firstCards: text('first_cards').array(),
  firstCollection: text('first_collection'),
  firstConnection: text('first_connection'),
  pwaInstalled: timestamp('pwa_installed', { withTimezone: true }),
  iosShortcutInstalled: timestamp('ios_shortcut_installed', {
    withTimezone: true,
  }),
  browserExtensionInstalled: timestamp('browser_extension_installed', {
    withTimezone: true,
  }),
  saveModalGuideCompleted: timestamp('save_modal_guide_completed', {
    withTimezone: true,
  }),
  connectionCreationModalCompleted: timestamp(
    'connection_creation_modal_completed',
    { withTimezone: true },
  ),
  semblePageNavigationCompleted: timestamp('semble_page_navigation_completed', {
    withTimezone: true,
  }),
  intention: text('intention').array(),
  referralSource: text('referral_source').array(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
