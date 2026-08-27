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
import ExploreCollectionsError from './Error.ExploreCollections';
import { EXPLORE_ROUTES } from '../../lib/exploreRoutes';
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
    <Stack>
      <ExploreSectionHeader
        icon={<BiCollection size={22} />}
        title="Collections"
        subtitle="Recommended for you"
        viewAllHref={EXPLORE_ROUTES.collections}
        actions={
          <RefreshButton
            onRefresh={() => {
              setShuffled(true);
              recommended.refetch();
            }}
            isRefreshing={isRefreshing}
            subject="collections"
          />
        }
      />

      {recommended.isPending ? (
        <ExploreCollectionsListSkeleton />
      ) : hasFailed ? (
        <ExploreCollectionsError />
      ) : collections.length > 0 ? (
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
