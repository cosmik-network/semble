import { EXPLORE_ROUTES } from '@/features/explore/lib/exploreRoutes';
import { UserSettings } from '@/features/settings/lib/queries/useUserSettings';
import { FeedView } from './feedOptions';

/** Which icon the empty state leads with. Resolved to a component by the view. */
export type FeedEmptyIcon = 'filter' | 'global' | 'following' | 'bluesky';

export type FeedEmptyAction =
  | { kind: 'clearFilters'; label: string }
  | { kind: 'link'; label: string; href: string };

export interface FeedEmptyState {
  message: string;
  icon: FeedEmptyIcon;
  /** Absent when there is nothing useful to do from here. */
  action?: FeedEmptyAction;
}

const FIND_PEOPLE: FeedEmptyAction = {
  kind: 'link',
  label: 'Find people to follow',
  href: EXPLORE_ROUTES.profiles,
};

/**
 * What an empty feed should say. Every view used to share "No activity to show
 * yet", which reads as an empty network even when the reader has simply
 * filtered everything out.
 *
 * Filters win over the view: an empty filtered feed says nothing about who you
 * follow, and clearing them is the one action that is certain to help.
 */
export function feedEmptyState(params: {
  view: FeedView;
  hasFilters: boolean;
}): FeedEmptyState {
  if (params.hasFilters) {
    return {
      message: 'Nothing matches these filters',
      icon: 'filter',
      action: { kind: 'clearFilters', label: 'Clear filters' },
    };
  }

  switch (params.view) {
    case 'following':
      return {
        message: "The people and collections you follow haven't saved anything yet",
        icon: 'following',
        action: FIND_PEOPLE,
      };
    case 'bskyFollowing':
      // One line for both cases — nobody you follow on Bluesky is here yet, and
      // they are here but have saved nothing — because the sentence is true of
      // both and telling them apart costs a request on every empty render.
      return {
        message: 'Nobody you follow on Bluesky has saved anything here yet',
        icon: 'bluesky',
        action: FIND_PEOPLE,
      };
    case 'global':
      // Reachable only when the network itself is empty, so there is nothing to
      // send the reader off to do.
      return { message: 'No activity yet', icon: 'global' };
  }
}

/**
 * The view is not a filter: it is the feed the reader chose, and clearing it
 * from under them is not what "clear filters" should mean here. (FeedControls'
 * own `hasActiveFilters` does count it, because its Clear resets everything.)
 */
export function hasFeedFilters(
  settings: Pick<
    UserSettings,
    'feedUrlType' | 'feedSource' | 'feedActivityType'
  >,
): boolean {
  return (
    settings.feedUrlType !== null ||
    settings.feedSource !== null ||
    settings.feedActivityType !== null
  );
}
