'use client';

import { Stack } from '@mantine/core';
import useFollowingCollections from '../../lib/queries/useFollowingCollections';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import { FollowSource } from '@/features/analytics/types';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import { BiCollection } from 'react-icons/bi';

interface Props {
  handle: string;
}

export default function FollowingCollectionsContainer(props: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useFollowingCollections({ identifier: props.handle });

  const allCollections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  if (allCollections.length === 0) {
    return (
      <EmptyState
        icon={BiCollection}
        message="Not following any collections... yet"
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
      <Stack gap={'xs'}>
        {allCollections.map((collection) => (
          <CollectionCard
            key={collection.id}
            collection={collection}
            showAuthor
            followSource={FollowSource.PROFILE_NETWORK}
          />
        ))}
      </Stack>
    </InfiniteScroll>
  );
}
