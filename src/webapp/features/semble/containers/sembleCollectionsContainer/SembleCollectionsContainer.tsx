'use client';

import useSembleCollections from '@/features/collections/lib/queries/useSembleCollections';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { Group, SimpleGrid, Stack } from '@mantine/core';
import ErrorState from '@/components/contentDisplay/errorState/ErrorState';
import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import { FollowSource } from '@/features/analytics/types';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import { BiCollection } from 'react-icons/bi';
import { useSettings } from '@/providers/settings';
import {
  CollectionFiltersRoot,
  CollectionFiltersSortSelect,
  CollectionFiltersViewToggle,
} from '@/features/collections/components/collectionFilters/CollectionFilters';
import { CollectionSortField } from '@semble/types';
import { useSearchParams } from 'next/navigation';

interface Props {
  url: string;
}

export default function SembleCollectionsContainer(props: Props) {
  const searchParams = useSearchParams();
  const sortBy =
    (searchParams.get('collectionSort') as CollectionSortField) ??
    CollectionSortField.ADDED_AT;

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useSembleCollections({ url: props.url, sortBy });

  const { settings } = useSettings();
  const allCollections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  if (error) {
    return <ErrorState message="Could not load collections" />;
  }

  if (allCollections.length === 0) {
    return (
      <Stack>
        <Group>
          <CollectionFiltersRoot>
            <CollectionFiltersSortSelect showAddedAt />
            <CollectionFiltersViewToggle />
          </CollectionFiltersRoot>
        </Group>

        <EmptyState message="No collections" icon={BiCollection} />
      </Stack>
    );
  }

  return (
    <Stack>
      <Group>
        <CollectionFiltersRoot>
          <CollectionFiltersSortSelect showAddedAt />
          <CollectionFiltersViewToggle />
        </CollectionFiltersRoot>
      </Group>

      <InfiniteScroll
        dataLength={allCollections.length}
        hasMore={!!hasNextPage}
        isInitialLoading={isPending}
        isLoading={isFetchingNextPage}
        loadMore={fetchNextPage}
      >
        <SimpleGrid
          cols={
            settings.collectionView !== 'grid'
              ? { base: 1 }
              : { base: 1, sm: 2, lg: 3 }
          }
          spacing="xs"
        >
          {allCollections.map((col) => (
            <CollectionCard
              key={col.uri}
              collection={col}
              showAuthor
              followSource={FollowSource.SEMBLE_PAGE}
            />
          ))}
        </SimpleGrid>
      </InfiniteScroll>
    </Stack>
  );
}
