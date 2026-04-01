'use client';

import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import useSearchCollections from '@/features/collections/lib/queries/useSearchCollections';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { SimpleGrid } from '@mantine/core';
import { BiCollection } from 'react-icons/bi';
import ProfileEmptyTab from '@/features/profile/components/profileEmptyTab/ProfileEmptyTab';
import AtmosphereConfCollectionsContainerError from '../atmosphereConfCollectionsContainer/Error.AtmosphereConfCollectionsContainer';
import AtmosphereConfCollectionsContainerContentSkeleton from './Skeleton.AtmosphereConfCollectionsContainerContent';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';

export default function AtmosphereConfCollectionsContainerContent() {
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
  });

  const { settings } = useUserSettings();
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
      <ProfileEmptyTab
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
      <SimpleGrid cols={settings.collectionView !== 'grid' ? { base: 1 } : { base: 1, sm: 2, lg: 4 }} spacing="xs">
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
