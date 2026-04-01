'use client';

import useSembleCollections from '@/features/collections/lib/queries/useSembleCollectionts';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { SimpleGrid } from '@mantine/core';
import SembleCollectionsError from './Error.SembleCollectionsContainer';
import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import SembleEmptyTab from '../../components/sembleEmptyTab/SembleEmptyTab';
import { BiCollection } from 'react-icons/bi';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';

interface Props {
  url: string;
}

export default function SembleCollectionsContainer(props: Props) {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useSembleCollections({ url: props.url });

  const { settings } = useUserSettings();
  const allCollections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  if (error) {
    return <SembleCollectionsError />;
  }

  if (allCollections.length === 0) {
    return <SembleEmptyTab message="No collections" icon={BiCollection} />;
  }

  return (
    <InfiniteScroll
      dataLength={allCollections.length}
      hasMore={!!hasNextPage}
      isInitialLoading={isPending}
      isLoading={isFetchingNextPage}
      loadMore={fetchNextPage}
    >
      <SimpleGrid cols={settings.cardView !== 'grid' ? { base: 1 } : { base: 1, sm: 2, lg: 4 }} spacing="xs">
        {allCollections.map((col) => (
          <CollectionCard key={col.uri} collection={col} showAuthor />
        ))}
      </SimpleGrid>
    </InfiniteScroll>
  );
}
