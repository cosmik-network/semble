'use client';

import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import useSearchCollections from '@/features/collections/lib/queries/useSearchCollections';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { SimpleGrid } from '@mantine/core';
import GemsCollectionsContainerError from './Error.GemsCollectionsContainerContent';
import { BiCollection } from 'react-icons/bi';
import ProfileEmptyTab from '@/features/profile/components/profileEmptyTab/ProfileEmptyTab';

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

  const allCollections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  if (error) {
    return <GemsCollectionsContainerError />;
  }

  if (allCollections.length === 0) {
    return (
      <ProfileEmptyTab message="No collections found" icon={BiCollection} />
    );
  }

  return (
    <InfiniteScroll
      dataLength={allCollections.length}
      hasMore={!!hasNextPage}
      isInitialLoading={isPending}
      isLoading={isFetchingNextPage}
      loadMore={fetchNextPage}
    >
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
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
