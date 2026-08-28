'use client';

import { usePathname } from 'next/navigation';
import { UrlType } from '@semble/types';
import { BiLink } from 'react-icons/bi';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import { CardSaveSource } from '@/features/analytics/types';
import { useAuth } from '@/hooks/useAuth';
import useGlobalFeedSeeds from '@/features/feeds/lib/queries/useGlobalFeedSeeds';
import useRecommendedCards from '../../lib/queries/useRecommendedCards';
import UrlViewGrid from '../../components/urlViewGrid/UrlViewGrid';
import { dedupeUrlViews } from '../../lib/utils';
import ErrorState from '@/components/contentDisplay/errorState/ErrorState';
import ExploreCardsRecommendedContentSkeleton from './Skeleton.ExploreCardsRecommendedContent';

interface Props {
  nonce: number;
  urlType?: UrlType;
}

export default function ExploreCardsRecommendedContent(props: Props) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const primary = useRecommendedCards({
    // No queries: the server derives them from the reader's library and bio
    // when signed in, from recent global feed activity otherwise, then hands
    // them back for the hook to carry across pages.
    nonce: props.nonce,
    urlType: props.urlType,
    // `pinQueries` is not part of the query key, so a request that goes out
    // with the wrong value cannot be corrected: flipping it later returns the
    // cached response, and the server-derived queries are never pinned. Hold
    // the request until the session — and so the value — is settled.
    enabled: !isAuthLoading,
    pinQueries: isAuthenticated,
  });

  // A signed-in reader with an empty library and no bio leaves the server
  // nothing to derive from, and it only falls back to the global feed for
  // signed-out callers — so seed it from the client rather than showing an
  // empty page to everyone who hasn't saved anything yet.
  const hasPrimaryResults = (primary.data?.pages[0]?.urls.length ?? 0) > 0;
  const needsFallback =
    !primary.isPending && !primary.error && !hasPrimaryResults;

  const seeds = useGlobalFeedSeeds({ enabled: needsFallback });
  const fallback = useRecommendedCards({
    queries: seeds.queries,
    nonce: props.nonce,
    urlType: props.urlType,
    enabled: seeds.queries.length > 0,
  });

  const active = needsFallback ? fallback : primary;
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = active;

  const error = needsFallback ? (seeds.error ?? fallback.error) : primary.error;

  // On the fallback path the recommendation query stays disabled — and so
  // "pending" — when the network had no seeds either. That's an empty result,
  // not a load, so don't leave the skeleton up forever.
  const isPending = needsFallback
    ? seeds.isPending || (seeds.queries.length > 0 && fallback.isPending)
    : primary.isPending;

  if (error) {
    return <ErrorState message="Could not load cards" />;
  }

  if (isPending) {
    return <ExploreCardsRecommendedContentSkeleton />;
  }

  const allUrls = dedupeUrlViews(
    active.data?.pages.flatMap((page) => page.urls ?? []) ?? [],
  );

  if (allUrls.length === 0) {
    return <EmptyState message="No recommendations found" icon={BiLink} />;
  }

  return (
    <InfiniteScroll
      dataLength={allUrls.length}
      hasMore={!!hasNextPage}
      isInitialLoading={isPending}
      isLoading={isFetchingNextPage}
      loadMore={fetchNextPage}
    >
      <UrlViewGrid
        urls={allUrls}
        analyticsContext={{
          saveSource: CardSaveSource.RECOMMENDED,
          pagePath: pathname,
        }}
      />
    </InfiniteScroll>
  );
}
