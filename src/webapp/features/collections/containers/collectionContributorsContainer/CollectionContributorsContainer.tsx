'use client';

import { Box, Stack, Badge } from '@mantine/core';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import useCollectionContributors from '../../lib/queries/useCollectionContributors';
import ProfileCard from '@/features/profile/components/profileCard/ProfileCard';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import { HiUsers } from 'react-icons/hi';
import { FaSeedling } from 'react-icons/fa6';

interface Props {
  collectionId: string;
}

export default function CollectionContributorsContainer(props: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useCollectionContributors({ collectionId: props.collectionId });

  const allUsers = data?.pages.flatMap((page) => page.users ?? []) ?? [];

  if (allUsers.length === 0) {
    return <EmptyState icon={HiUsers} message="No contributors yet" />;
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
          <Box
            key={user.id}
            style={{
              contentVisibility: 'auto',
              containIntrinsicSize: 'auto 80px',
            }}
          >
            <ProfileCard profile={user}>
              {user.contributionCount > 0 && (
                <Badge
                  variant="light"
                  color="green"
                  radius="md"
                  leftSection={<FaSeedling size={10} />}
                >
                  {user.contributionCount}{' '}
                  {user.contributionCount === 1
                    ? 'Contribution'
                    : 'Contributions'}
                </Badge>
              )}
            </ProfileCard>
          </Box>
        ))}
      </Stack>
    </InfiniteScroll>
  );
}
