'use client';

import { Stack } from '@mantine/core';
import useFollowers from '../../lib/queries/useFollowers';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import ProfileCard from '@/features/profile/components/profileCard/ProfileCard';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import { HiUsers } from 'react-icons/hi';

interface Props {
  handle: string;
}

export default function FollowersContainer(props: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useFollowers({ identifier: props.handle });

  const allUsers = data?.pages.flatMap((page) => page.users ?? []) ?? [];

  if (allUsers.length === 0) {
    return <EmptyState icon={HiUsers} message="No followers... yet" />;
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
