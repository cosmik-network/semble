'use client';

import { SimpleGrid } from '@mantine/core';
import { BiCollection } from 'react-icons/bi';
import { CollectionSortField } from '@semble/types';
import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import useSearchCollections from '@/features/collections/lib/queries/useSearchCollections';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import ProfileEmptyTab from '@/features/profile/components/profileEmptyTab/ProfileEmptyTab';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';
import { CollectionFilterState } from '../../components/collectionFilters/CollectionFilters';
import ExploreCollectionsContainerError from '../exploreCollectionsContainer/Error.ExploreCollectionsContainer';
import ExploreCollectionsBrowseContentSkeleton from './Skeleton.ExploreCollectionsBrowseContent';

const PAGE_SIZE = 24;

interface Props {
  searchText: string;
  filters: CollectionFilterState;
}

export default function ExploreCollectionsBrowseContent(props: Props) {
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useSearchCollections({
    searchText: props.searchText,
    limit: PAGE_SIZE,
    sortBy: props.filters.sort ?? CollectionSortField.UPDATED_AT,
    sortOrder: props.filters.sortOrder,
    accessType: props.filters.accessType,
    identifier: props.filters.author,
  });

  const { settings } = useUserSettings();
  const allCollections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  if (error) {
    return <ExploreCollectionsContainerError />;
  }

  if (isLoading) {
    return <ExploreCollectionsBrowseContentSkeleton />;
  }

  if (allCollections.length === 0) {
    const isFiltered =
      !!props.searchText ||
      !!props.filters.accessType ||
      !!props.filters.author;

    return (
      <ProfileEmptyTab
        message={
          isFiltered
            ? 'No collections match these filters'
            : 'No collections found'
        }
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
          />
        ))}
      </SimpleGrid>
    </InfiniteScroll>
  );
}
