'use client';

import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import useSearchCollections from '@/features/collections/lib/queries/useSearchCollections';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { SimpleGrid } from '@mantine/core';
import ErrorState from '@/components/contentDisplay/errorState/ErrorState';
import { BiCollection } from 'react-icons/bi';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import { useSettings } from '@/providers/settings';

export default function GemsCollectionsContainerContent() {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useSearchCollections({
    searchText: '💎 2025',
  });

  const { settings } = useSettings();
  const allCollections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  if (error) {
    return <ErrorState message="Could not load collections" />;
  }

  if (allCollections.length === 0) {
    return <EmptyState message="No collections found" icon={BiCollection} />;
  }

  return (
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
        {allCollections.map((collection) => (
          <CollectionCard
            key={collection.id}
            collection={collection}
            showAuthor={true}
          />
        ))}
      </SimpleGrid>
    </InfiniteScroll>
  );
}
