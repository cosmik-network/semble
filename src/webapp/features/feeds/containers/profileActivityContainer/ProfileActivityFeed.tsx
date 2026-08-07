'use client';

import { Box, Center, Container, Stack, Text } from '@mantine/core';
import { usePathname } from 'next/navigation';
import useGlobalFeed from '@/features/feeds/lib/queries/useGlobalFeed';
import FeedItem from '@/features/feeds/components/feedItem/FeedItem';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { CardSaveSource } from '@/features/analytics/types';

interface Props {
  profileId: string;
}

export default function ProfileActivityFeed({ profileId }: Props) {
  const pathname = usePathname();

  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useGlobalFeed({ actorIds: [profileId] });

  const allActivities =
    data?.pages.flatMap((page) => page.activities ?? []) ?? [];

  if (allActivities.length === 0) {
    return (
      <Container p="xs" size="xl">
        <Center>
          <Text fz="h3" fw={600} c="gray">
            No activity to show yet
          </Text>
        </Center>
      </Container>
    );
  }

  return (
    <Container p="xs" size="xl">
      <InfiniteScroll
        dataLength={allActivities.length}
        hasMore={!!hasNextPage}
        isInitialLoading={isPending}
        isLoading={isFetchingNextPage}
        loadMore={fetchNextPage}
      >
        <Stack gap={'xl'} mx={'auto'} maw={600} w={'100%'}>
          <Stack gap={60}>
            {allActivities.map((item) => (
              <Box
                key={item.id}
                style={{
                  contentVisibility: 'auto',
                  containIntrinsicSize: 'auto 400px',
                }}
              >
                <FeedItem
                  item={item}
                  analyticsContext={{
                    saveSource: CardSaveSource.FEED,
                    pagePath: pathname,
                  }}
                />
              </Box>
            ))}
          </Stack>
        </Stack>
      </InfiniteScroll>
    </Container>
  );
}
