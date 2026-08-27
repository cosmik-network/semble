'use client';

import { Container, Stack, Text, Center } from '@mantine/core';
import useFollowingUsers from '../../lib/queries/useFollowingUsers';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import ProfileCard from '@/features/profile/components/profileCard/ProfileCard';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import { HiUsers } from 'react-icons/hi';

interface Props {
  handle: string;
}

export default function FollowingContainer(props: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useFollowingUsers({ identifier: props.handle });

  const allUsers = data?.pages.flatMap((page) => page.users ?? []) ?? [];

  if (isPending) {
    return (
      <Container p="xs" size="xl">
        <Center>
          <Text c="gray">Loading...</Text>
        </Center>
      </Container>
    );
  }

  return (
    <Container p="xs" size="xl">
      <Stack align="center">
        {allUsers.length === 0 ? (
          <EmptyState icon={HiUsers} message="Not following anyone... yet" />
        ) : (
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
        )}
      </Stack>
    </Container>
  );
}
