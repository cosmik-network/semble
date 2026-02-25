'use client';

import { Container, Stack, Text, Center } from '@mantine/core';
import useFollowers from '../../lib/queries/useFollowers';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import ProfileCard from '@/features/profile/components/profileCard/ProfileCard';

interface Props {
  handle: string;
}

export default function FollowersContainer(props: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useFollowers({ identifier: props.handle });

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
          <Center>
            <Text fz="h3" fw={600} c="gray">
              No followers... yet
            </Text>
          </Center>
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
