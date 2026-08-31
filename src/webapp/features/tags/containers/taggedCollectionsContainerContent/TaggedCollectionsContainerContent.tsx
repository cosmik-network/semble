'use client';

import { Center, Stack } from '@mantine/core';
import { BiHash } from 'react-icons/bi';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import useTaggedItems from '../../lib/queries/useTaggedItems';

interface Props {
  tag: string;
  handleOrDid?: string;
}

export default function TaggedCollectionsContainerContent(props: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTaggedItems({
      tag: props.tag,
      itemType: 'collection',
      user: props.handleOrDid,
    });

  // CollectionCard links by AT-URI, which an unpublished collection lacks.
  const collections = data.pages
    .flatMap((page) => page.collections ?? [])
    .filter((collection) => collection.uri);

  if (collections.length === 0) {
    return (
      <Center py="xl">
        <EmptyState
          icon={BiHash}
          message={`No collections tagged #${props.tag} here`}
          description={
            props.handleOrDid
              ? 'Try clearing the profile filter'
              : 'Try another tab'
          }
        />
      </Center>
    );
  }

  return (
    <InfiniteScroll
      dataLength={collections.length}
      hasMore={!!hasNextPage}
      isInitialLoading={false}
      isLoading={isFetchingNextPage}
      loadMore={fetchNextPage}
    >
      <Stack gap="xs">
        {collections.map((collection) => (
          <CollectionCard
            key={collection.id}
            collection={collection}
            showAuthor
          />
        ))}
      </Stack>
    </InfiniteScroll>
  );
}
