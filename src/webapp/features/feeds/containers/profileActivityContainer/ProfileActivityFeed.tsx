'use client';

import { Box, Container, Stack } from '@mantine/core';
import { usePathname } from 'next/navigation';
import useGlobalFeed from '@/features/feeds/lib/queries/useGlobalFeed';
import FeedItem from '@/features/feeds/components/feedItem/FeedItem';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { CardSaveSource } from '@/features/analytics/types';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import { MdOutlineEmojiNature } from 'react-icons/md';

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
        <EmptyState
          icon={MdOutlineEmojiNature}
          message="No activity to show yet"
        />
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
