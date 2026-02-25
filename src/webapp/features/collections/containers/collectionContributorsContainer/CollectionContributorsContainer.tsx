'use client';

import { Container, Stack, Text, Center, Badge } from '@mantine/core';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import useCollectionContributors from '../../lib/queries/useCollectionContributors';
import ProfileCard from '@/features/profile/components/profileCard/ProfileCard';

interface Props {
  collectionId: string;
}

export default function CollectionContributorsContainer(props: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useCollectionContributors({ collectionId: props.collectionId });

  const allUsers = data?.pages.flatMap((page) => page.users ?? []) ?? [];

  return (
    <Container p="xs" size="xl">
      <Stack align="center">
        {allUsers.length === 0 ? (
          <Center>
            <Text fz="h3" fw={600} c="gray">
              No contributors yet
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
                <ProfileCard key={user.id} profile={user}>
                  {user.contributionCount && (
                    <Badge variant="light" color="blue">
                      {user.contributionCount}{' '}
                      {user.contributionCount === 1
                        ? 'Contribution'
                        : 'Contributions'}
                    </Badge>
                  )}
                </ProfileCard>
              ))}
            </Stack>
          </InfiniteScroll>
        )}
      </Stack>
    </Container>
  );
}
