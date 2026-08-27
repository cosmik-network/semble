'use client';

import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import { FollowSource } from '@/features/analytics/types';
import useSearchCollections from '@/features/collections/lib/queries/useSearchCollections';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { SimpleGrid } from '@mantine/core';
import { BiCollection } from 'react-icons/bi';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import AtmosphereConfCollectionsContainerError from '../atmosphereConfCollectionsContainer/Error.AtmosphereConfCollectionsContainer';
import AtmosphereConfCollectionsContainerContentSkeleton from './Skeleton.AtmosphereConfCollectionsContainerContent';
import { useSettings } from '@/providers/settings';
import { useSearchParams } from 'next/navigation';
import { CollectionSortField } from '@semble/types';

export default function AtmosphereConfCollectionsContainerContent() {
  const searchParams = useSearchParams();
  const sortBy =
    (searchParams.get('collectionSort') as CollectionSortField) ??
    CollectionSortField.UPDATED_AT;

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useSearchCollections({
    searchText: 'atmosphereConf',
    sortBy,
  });

  const { settings } = useSettings();
  const allCollections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  if (error) {
    return <AtmosphereConfCollectionsContainerError />;
  }

  if (isLoading) {
    return <AtmosphereConfCollectionsContainerContentSkeleton />;
  }

  if (allCollections.length === 0) {
    return (
      <EmptyState
        message="No AtmosphereConf collections found"
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
            followSource={FollowSource.EXPLORE}
          />
        ))}
      </SimpleGrid>
    </InfiniteScroll>
  );
}
