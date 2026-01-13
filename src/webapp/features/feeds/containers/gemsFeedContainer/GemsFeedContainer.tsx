'use client';

import useGemsFeed from '@/features/feeds/lib/queries/useGemsFeed';
import FeedItem from '@/features/feeds/components/feedItem/FeedItem';
import { Stack, Text, Center, Container, Box, Loader } from '@mantine/core';
import GemsFeedContainerSkeleton from './Skeleton.GemsFeedContainer';
import GemsFeedContainerError from './Error.GemsFeedContainer';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import RefetchButton from '@/components/navigation/refetchButton/RefetchButton';
import { useSearchParams } from 'next/navigation';
import { UrlType } from '@semble/types';

export default function GemsFeedContainer() {
  const searchParams = useSearchParams();
  const selectedUrlType = searchParams.get('type') as UrlType;

  const {
    data,
    error,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
    refetch,
  } = useGemsFeed({ urlType: selectedUrlType });

  const allActivities =
    data?.pages.flatMap((page) => page.activities ?? []) ?? [];

  if (isPending) {
    return <GemsFeedContainerSkeleton />;
  }

  if (error) {
    return <GemsFeedContainerError />;
  }

  return (
    <Container p="xs" size="xl">
      <Stack align="center">
        {isRefetching && (
          <Stack align="center" gap={'xs'}>
            <Loader color={'gray'} />
            <Text fw={600} c={'gray'}>
              Fetching the latest gems...
            </Text>
          </Stack>
        )}
        {allActivities.length === 0 ? (
          <Center>
            <Text fz="h3" fw={600} c="gray">
              No gems to show yet
            </Text>
          </Center>
        ) : (
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
                  <FeedItem key={item.id} item={item} />
                ))}
              </Stack>
            </Stack>
          </InfiniteScroll>
        )}
      </Stack>

      <Box
        pos={'fixed'}
        bottom={0}
        mt={'md'}
        mx={{ base: 10, sm: 2.5 }}
        mb={{ base: 100, sm: 'md' }}
        style={{ zIndex: 2 }}
      >
        <RefetchButton onRefetch={() => refetch()} />
      </Box>
    </Container>
  );
}
