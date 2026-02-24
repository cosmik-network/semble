'use client';

import { Container, Stack, Text, Center } from '@mantine/core';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import useCollectionFollowers from '../../lib/queries/useCollectionFollowers';
import ProfileCard from '@/features/profile/components/profileCard/ProfileCard';

interface Props {
  collectionId: string;
}

export default function CollectionFollowersContainer(props: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useCollectionFollowers({ collectionId: props.collectionId });

  const allUsers = data?.pages.flatMap((page) => page.users ?? []) ?? [];

  return (
    <Container p="xs" size="xl">
      <Stack align="center">
        {allUsers.length === 0 ? (
          <Center>
            <Text fz="h3" fw={600} c="gray">
              Not followed by anyone... yet
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
