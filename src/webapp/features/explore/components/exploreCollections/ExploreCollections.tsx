'use client';

import { useState } from 'react';
import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import { FollowSource } from '@/features/analytics/types';
import useRecommendedCollections from '@/features/collections/lib/queries/useRecommendedCollections';
import ExploreShelf from '../exploreShelf/ExploreShelf';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import ExploreScroller, {
  COLLECTION_TILE_WIDTH,
} from '../exploreScroller/ExploreScroller';
import RefreshButton from '../refreshButton/RefreshButton';
import { ExploreCollectionsListSkeleton } from './Skeleton.ExploreCollections';
import ExploreCollectionsError from './Error.ExploreCollections';
import useExploreSeedUrls from '../../lib/queries/useExploreSeedUrls';

const SHELF_SIZE = 10;

export default function ExploreCollections() {
  const [shuffled, setShuffled] = useState(false);
  const seedUrls = useExploreSeedUrls();
  const recommended = useRecommendedCollections({ urls: seedUrls });

  const isRefreshing = !recommended.isPending && recommended.isFetching;
  const collections = (recommended.data?.collections ?? []).slice(
    0,
    SHELF_SIZE,
  );
  // A failed refetch keeps the previous set on screen, so only take over the
  // shelf when there's nothing left to show.
  const hasFailed = recommended.isError && collections.length === 0;

  return (
    <ExploreShelf
      section="collections"
      actions={
        <RefreshButton
          onRefresh={() => {
            setShuffled(true);
            recommended.refetch();
          }}
          isRefreshing={isRefreshing}
          label="Show different collections"
        />
      }
    >
      {recommended.isPending ? (
        <ExploreCollectionsListSkeleton />
      ) : hasFailed ? (
        <ExploreCollectionsError />
      ) : collections.length === 0 ? (
        <EmptyState message="No collections to suggest yet" />
      ) : (
        // A fresh fetch — even one that returns identical data — is a new row.
        <ExploreScroller
          key={recommended.dataUpdatedAt}
          itemWidth={COLLECTION_TILE_WIDTH}
          animateOnMount={shuffled}
          dimmed={isRefreshing}
        >
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              showAuthor
              followSource={FollowSource.RECOMMENDED}
            />
          ))}
        </ExploreScroller>
      )}
    </ExploreShelf>
  );
}
