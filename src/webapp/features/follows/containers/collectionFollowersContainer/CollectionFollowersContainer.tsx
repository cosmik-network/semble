'use client';

import { Stack } from '@mantine/core';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import useCollectionFollowers from '../../lib/queries/useCollectionFollowers';
import ProfileCard from '@/features/profile/components/profileCard/ProfileCard';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import { HiUsers } from 'react-icons/hi';

interface Props {
  collectionId: string;
}

export default function CollectionFollowersContainer(props: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useCollectionFollowers({ collectionId: props.collectionId });

  const allUsers = data?.pages.flatMap((page) => page.users ?? []) ?? [];

  if (allUsers.length === 0) {
    return (
      <EmptyState icon={HiUsers} message="Not followed by anyone... yet" />
    );
  }

  return (
    <InfiniteScroll
      dataLength={allUsers.length}
      hasMore={!!hasNextPage}
      isInitialLoading={isPending}
      isLoading={isFetchingNextPage}
      loadMore={fetchNextPage}
    >
      <Stack gap={'xs'}>
        {allUsers.map((user) => (
          <ProfileCard key={user.id} profile={user} />
        ))}
      </Stack>
    </InfiniteScroll>
  );
}
