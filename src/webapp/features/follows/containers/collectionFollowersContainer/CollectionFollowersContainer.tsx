'use client';

import { Container, Stack } from '@mantine/core';
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

  return (
    <Container p="xs" size="xl">
      <Stack align="center">
        {allUsers.length === 0 ? (
          <EmptyState icon={HiUsers} message="Not followed by anyone... yet" />
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
