import posthog from 'posthog-js';
import { shouldCaptureAnalytics } from '@/features/analytics/utils';
import { EntrySource, ItemClick } from '@/features/analytics/pageVisit';
import { ExploreSection } from './exploreSections';
import { FeedDestination } from './feedDestinations';
import { ProfilesView } from './profilesView';

export type ExploreAction = 'refresh' | 'view_all';

interface ExploreVisit {
  visit_id: string;
  is_logged_in: boolean;
  entry_source: EntrySource;
}

// Module level, like the other page visits, so the shelves and feed tiles can
// report without a context provider. Never cleared: everything that reports
// here only renders on /explore, and the next visit replaces this one.
let currentVisit: ExploreVisit | null = null;

function capture(event: string, properties?: object) {
  if (!shouldCaptureAnalytics() || !currentVisit) return;
  posthog.capture(event, { ...currentVisit, ...properties });
}

export function startExploreVisit(visit: Omit<ExploreVisit, 'visit_id'>) {
  currentVisit = { ...visit, visit_id: crypto.randomUUID() };
  capture('explore:viewed');
}

/** `profiles_view` is only set for the profiles shelf. */
export function trackExploreItemClicked(
  section: ExploreSection,
  click: ItemClick & { profiles_view?: ProfilesView },
) {
  capture('explore:item_clicked', { section, ...click });
}

export function trackExploreAction(
  section: ExploreSection,
  action: ExploreAction,
) {
  capture('explore:action', { section, action });
}

export function trackExploreProfilesViewChanged(to: ProfilesView) {
  capture('explore:profiles_view_changed', { to });
}

/** A feed card or type tile in "Happening now", which opens /home. */
export function trackExploreFeedSelected(destination: FeedDestination) {
  capture('explore:feed_selected', {
    destination: destination.id,
    feed_view: destination.feedView,
    url_type: destination.urlType,
  });
}
