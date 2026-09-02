'use client';

import { Center, Stack } from '@mantine/core';
import { BiHash } from 'react-icons/bi';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import ProfileConnectionItem from '@/features/connections/components/profileConnectionItem/ProfileConnectionItem';
import useTaggedItems from '../../lib/queries/useTaggedItems';

interface Props {
  tag: string;
  handleOrDid?: string;
}

export default function TaggedConnectionsContainerContent(props: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTaggedItems({
      tag: props.tag,
      itemType: 'connection',
      user: props.handleOrDid,
    });

  const connections = data.pages.flatMap((page) => page.connections ?? []);

  if (connections.length === 0) {
    return (
      <Center py="xl">
        <EmptyState
          icon={BiHash}
          message={`No connections tagged #${props.tag} here`}
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
      dataLength={connections.length}
      hasMore={!!hasNextPage}
      isInitialLoading={false}
      isLoading={isFetchingNextPage}
      loadMore={fetchNextPage}
    >
      <Stack gap="xs">
        {connections.map((connection) => (
          <ProfileConnectionItem
            key={connection.connection.id}
            connection={connection}
            curator={connection.connection.curator}
          />
        ))}
      </Stack>
    </InfiniteScroll>
  );
}
