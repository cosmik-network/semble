'use client';

import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import useSearchCollections from '@/features/collections/lib/queries/useSearchCollections';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { SimpleGrid } from '@mantine/core';
import { BiCollection } from 'react-icons/bi';
import ProfileEmptyTab from '@/features/profile/components/profileEmptyTab/ProfileEmptyTab';
import { CollectionAccessType, CollectionSortField } from '@semble/types';
import OpenCollectionsContainerError from '../openCollectionsContainer/Error.OpenCollectionsContainer';
import OpenCollectionsContainerContentSkeleton from './Skeleton.OpenCollectionsContainerContent';

interface Props {
  sortBy?: CollectionSortField;
}

export default function OpenCollectionsContainerContent(props: Props) {
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useSearchCollections({
    searchText: '',
    accessType: CollectionAccessType.OPEN,
    sortBy: props.sortBy,
  });

  const allCollections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  if (error) {
    return <OpenCollectionsContainerError />;
  }

  if (isLoading) {
    return <OpenCollectionsContainerContentSkeleton />;
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
