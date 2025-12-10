'use client';

import useGlobalFeed from '@/features/feeds/lib/queries/useGlobalFeed';
import FeedItem from '@/features/feeds/components/feedItem/FeedItem';
import {
  Stack,
  Title,
  Text,
  Center,
  Container,
  Box,
  Loader,
} from '@mantine/core';
import MyFeedContainerSkeleton from './Skeleton.MyFeedContainer';
import MyFeedContainerError from './Error.MyFeedContainer';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import RefetchButton from '@/components/navigation/refetchButton/RefetchButton';

export default function MyFeedContainer() {
  const {
    data,
    error,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
    refetch,
  } = useGlobalFeed();

  const allActivities =
    data?.pages.flatMap((page) => page.activities ?? []) ?? [];

  if (isPending) {
    return <MyFeedContainerSkeleton />;
  }

  if (error) {
    return <MyFeedContainerError />;
  }

  return (
    <Container p="xs" size="xl">
      <Stack align="center">
        <Title order={1}>Explore</Title>
        {isRefetching && (
          <Stack align="center" gap={'xs'}>
            <Loader color={'gray'} />
            <Text fw={600} c={'gray'}>
              Fetching the latest activities...
            </Text>
          </Stack>
        )}
        {allActivities.length === 0 ? (
          <Center h={200}>
            <Text fz="h3" fw={600} c="gray">
              No activity to show yet
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
