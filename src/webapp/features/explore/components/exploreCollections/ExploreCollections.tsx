'use client';

import { Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { BiCollection } from 'react-icons/bi';
import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import useRecommendedCollections from '@/features/collections/lib/queries/useRecommendedCollections';
import ExploreSectionHeader from '../exploreSectionHeader/ExploreSectionHeader';
import ExploreScroller, {
  COLLECTION_TILE_WIDTH,
} from '../exploreScroller/ExploreScroller';
import RefreshButton from '../refreshButton/RefreshButton';
import { ExploreCollectionsListSkeleton } from './Skeleton.ExploreCollections';
import { EXPLORE_ROUTES } from '../../lib/exploreRoutes';

const SHELF_SIZE = 10;

interface Props {
  /** Empty while the parent is still resolving them. */
  seedUrls: string[];
  isSeedPending: boolean;
}

export default function ExploreCollections(props: Props) {
  const recommended = useRecommendedCollections({ urls: props.seedUrls });

  // The hook is disabled (and stays "pending") with no seeds; only treat that
  // as loading while the parent is still resolving them.
  const isPending =
    props.isSeedPending || (props.seedUrls.length > 0 && recommended.isPending);
  const isRefreshing = !recommended.isPending && recommended.isFetching;
  const collections = (recommended.data?.collections ?? []).slice(
    0,
    SHELF_SIZE,
  );

  // Replay the deal animation when a fresh set lands, but not on first paint.
  // Adjusted during render rather than in an effect, which would lag a frame.
  const updatedAt = recommended.dataUpdatedAt;
  const [prevUpdatedAt, setPrevUpdatedAt] = useState(updatedAt);
  const [dealKey, setDealKey] = useState(0);
  if (updatedAt !== prevUpdatedAt) {
    setPrevUpdatedAt(updatedAt);
    if (prevUpdatedAt) setDealKey((k) => k + 1);
  }

  return (
    <Stack>
      <ExploreSectionHeader
        icon={<BiCollection size={22} />}
        title="Collections"
        subtitle="Recommended for you"
        viewAllHref={EXPLORE_ROUTES.collections}
        actions={
          <RefreshButton
            onRefresh={() => recommended.refetch()}
            isRefreshing={isRefreshing}
            subject="collections"
          />
        }
      />

      {isPending ? (
        <ExploreCollectionsListSkeleton />
      ) : collections.length > 0 ? (
        <ExploreScroller
          itemWidth={COLLECTION_TILE_WIDTH}
          dealKey={dealKey}
          dimmed={isRefreshing}
        >
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              showAuthor
            />
          ))}
        </ExploreScroller>
      ) : (
        <Stack align="center" gap="xs">
          <Text fz="h3" fw={600} c="gray">
            No collections to suggest yet
          </Text>
        </Stack>
      )}
    </Stack>
  );
}
