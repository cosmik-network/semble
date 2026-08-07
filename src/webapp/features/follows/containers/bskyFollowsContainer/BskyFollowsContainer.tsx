'use client';

import {
  Box,
  Button,
  Center,
  Container,
  Group,
  Stack,
  Text,
} from '@mantine/core';
import useBskyFollowedUsers from '../../lib/queries/useBskyFollowedUsers';
import { useFollowManyUsers } from '../../lib/mutations/useFollowManyUsers';
import { getBskyFollowedUsers } from '../../lib/dal';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import ProfileCard from '@/features/profile/components/profileCard/ProfileCard';
import FollowButton from '../../components/followButton/FollowButton';

export default function BskyFollowsContainer() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useBskyFollowedUsers();
  const { followMany, isPending: isFollowingAll } = useFollowManyUsers();

  const allUsers = data?.pages.flatMap((page) => page.users ?? []) ?? [];
  const totalCount = data?.pages[0]?.pagination.totalCount ?? 0;

  const handleFollowAll = async () => {
    // Collect every not-yet-followed user across all pages before following
    const targetIds: string[] = [];
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const response = await getBskyFollowedUsers({ page, limit: 100 });
      response.users.forEach((user) => {
        if (!user.isFollowing) targetIds.push(user.id);
      });
      hasMore = response.pagination.hasMore;
      page += 1;
    }
    if (targetIds.length > 0) {
      followMany(targetIds);
    }
  };

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
      <Stack>
        {allUsers.length === 0 ? (
          <Center>
            <Text fz="h3" fw={600} c="gray">
              No Semble users found in your Bluesky follows
            </Text>
          </Center>
        ) : (
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Text c="gray">
                {totalCount} {totalCount === 1 ? 'person' : 'people'} you follow
                on Bluesky {totalCount === 1 ? 'is' : 'are'} on Semble but not
                followed yet
              </Text>
              <Button
                size="xs"
                loading={isFollowingAll}
                onClick={handleFollowAll}
              >
                Follow all
              </Button>
            </Group>
            <InfiniteScroll
              dataLength={allUsers.length}
              hasMore={!!hasNextPage}
              isInitialLoading={isPending}
              isLoading={isFetchingNextPage}
              loadMore={fetchNextPage}
            >
              <Stack gap="xs">
                {allUsers.map((user) => (
                  // Overlay the button so it doesn't stretch the card, and
                  // keep it outside the card's link so clicks don't navigate
                  <Box key={user.id} pos="relative">
                    <ProfileCard profile={user} />
                    <Box pos="absolute" top={12} right={12}>
                      <FollowButton
                        targetId={user.id}
                        targetType="USER"
                        initialIsFollowing={user.isFollowing}
                        size="xs"
                      />
                    </Box>
                  </Box>
                ))}
              </Stack>
            </InfiniteScroll>
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
