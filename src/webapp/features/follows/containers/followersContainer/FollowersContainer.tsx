'use client';

import {
  Container,
  Stack,
  Text,
  Center,
  Avatar,
  Group,
  Paper,
} from '@mantine/core';
import useFollowers from '../../lib/queries/useFollowers';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import Link from 'next/link';

interface Props {
  identifier: string;
}

export default function FollowersContainer({ identifier }: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useFollowers({ identifier });

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
      <Stack>
        {allUsers.length === 0 ? (
          <Center>
            <Text fz="h3" fw={600} c="gray">
              No followers yet
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
            <Stack gap="xs" maw={600} mx="auto">
              {allUsers.map((user) => (
                <Paper
                  key={user.id}
                  p="md"
                  withBorder
                  component={Link}
                  href={`/profile/${user.handle}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <Group>
                    <Avatar
                      src={user.avatarUrl?.replace(
                        'avatar',
                        'avatar_thumbnail',
                      )}
                      size="md"
                    />
                    <Stack gap={0}>
                      <Text fw={600}>{user.name}</Text>
                      <Text c="gray" size="sm">
                        @{user.handle}
                      </Text>
                    </Stack>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </InfiniteScroll>
        )}
      </Stack>
    </Container>
  );
}
