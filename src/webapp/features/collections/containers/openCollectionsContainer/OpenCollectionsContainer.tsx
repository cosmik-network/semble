'use client';

import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import useSearchCollections from '@/features/collections/lib/queries/useSearchCollections';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { SimpleGrid } from '@mantine/core';
import { BiCollection } from 'react-icons/bi';
import ProfileEmptyTab from '@/features/profile/components/profileEmptyTab/ProfileEmptyTab';
import { CollectionAccessType } from '@semble/types';
import OpenCollectionsContainerError from './Error.OpenCollectionsContainer';

export default function OpenCollectionsContainer() {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useSearchCollections({
    searchText: '',
    accessType: CollectionAccessType.OPEN,
  });

  const allCollections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  if (error) {
    return <OpenCollectionsContainerError />;
  }

  if (allCollections.length === 0) {
    return (
      <ProfileEmptyTab
        message="No open collections found"
        icon={BiCollection}
      />
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
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="xs">
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
