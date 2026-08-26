'use client';

import { Suspense } from 'react';
import { ActivitySource, ActivityType, UrlType } from '@semble/types';
import useGlobalFeed from '@/features/feeds/lib/queries/useGlobalFeed';
import useFollowingFeed from '@/features/feeds/lib/queries/useFollowingFeed';
import useBskyFollowingFeed from '@/features/feeds/lib/queries/useBskyFollowingFeed';
import { useSettings } from '@/providers/settings';
import { hasFeedFilters } from '@/features/feeds/lib/feedEmptyState';
import FeedList from './FeedList';
import MyFeedContainerSkeleton from './Skeleton.MyFeedContainer';

/** The filter arguments every feed query takes. */
interface FeedFilters {
  urlType?: UrlType;
  source?: ActivitySource;
  activityTypes?: ActivityType[];
  includeKnownBots: boolean;
}

interface ViewProps {
  filters: FeedFilters;
  hasFilters: boolean;
  onClearFilters: () => void;
}

/*
 * One component per view, each mounting only its own query.
 *
 * That separation is the entire point: `useGlobalFeed` is a suspense query,
 * and react-query omits `enabled` from `UseSuspenseInfiniteQueryOptions` (and
 * excludes `skipToken` from its `queryFn`), so there is no way to hold it back
 * from inside a component that has called it. A single component calling all
 * three would therefore request the global feed on every view — and suspend on
 * it — while showing one of the other two.
 */
function GlobalFeed(props: ViewProps) {
  const query = useGlobalFeed(props.filters);

  return (
    <FeedList
      query={query}
      view="global"
      urlType={props.filters.urlType}
      hasFilters={props.hasFilters}
      onClearFilters={props.onClearFilters}
    />
  );
}

function FollowingFeed(props: ViewProps) {
  const query = useFollowingFeed(props.filters);

  return (
    <FeedList
      query={query}
      view="following"
      urlType={props.filters.urlType}
      hasFilters={props.hasFilters}
      onClearFilters={props.onClearFilters}
    />
  );
}

function BskyFollowingFeed(props: ViewProps) {
  const query = useBskyFollowingFeed(props.filters);

  return (
    <FeedList
      query={query}
      view="bskyFollowing"
      urlType={props.filters.urlType}
      hasFilters={props.hasFilters}
      onClearFilters={props.onClearFilters}
    />
  );
}

export default function MyFeedContainer() {
  const { settings, updateSettings, isHydrated } = useSettings();

  // Until localStorage has been read, `settings` still holds the defaults, and
  // mounting a feed now would request the wrong one — see the note above on why
  // a suspense query cannot be held back once mounted. Only a hard load of this
  // page reaches that state: `useSettings` reads the app-wide provider, which
  // has already hydrated by the time anything navigates here from inside.
  if (!isHydrated) return <MyFeedContainerSkeleton />;

  const filters: FeedFilters = {
    urlType: settings.feedUrlType ?? undefined,
    source: settings.feedSource ?? undefined,
    activityTypes: settings.feedActivityType
      ? [settings.feedActivityType]
      : undefined,
    includeKnownBots: settings.includeKnownBots,
  };

  const viewProps: ViewProps = {
    filters,
    hasFilters: hasFeedFilters(settings),
    onClearFilters: () =>
      updateSettings({
        feedUrlType: null,
        feedSource: null,
        feedActivityType: null,
      }),
  };

  // The suspense `useGlobalFeed` throws would otherwise bubble past this
  // container to the nearest ancestor boundary, blanking the page during a
  // client-side transition from explore.
  return (
    <Suspense fallback={<MyFeedContainerSkeleton />}>
      {settings.feedView === 'following' ? (
        <FollowingFeed {...viewProps} />
      ) : settings.feedView === 'bskyFollowing' ? (
        <BskyFollowingFeed {...viewProps} />
      ) : (
        <GlobalFeed {...viewProps} />
      )}
    </Suspense>
  );
}
