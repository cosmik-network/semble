'use client';

import useGlobalFeed from '@/features/feeds/lib/queries/useGlobalFeed';
import useFollowingFeed from '@/features/feeds/lib/queries/useFollowingFeed';
import FeedItem from '@/features/feeds/components/feedItem/FeedItem';
import { Stack, Text, Center, Container, Box, Loader, Tabs } from '@mantine/core';
import MyFeedContainerSkeleton from './Skeleton.MyFeedContainer';
import MyFeedContainerError from './Error.MyFeedContainer';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import RefetchButton from '@/components/navigation/refetchButton/RefetchButton';
import { UrlType, ActivitySource } from '@semble/types';
import { useSearchParams, useRouter } from 'next/navigation';

export default function MyFeedContainer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedUrlType = searchParams.get('type') as UrlType;
  const selectedSource = searchParams.get('source') as ActivitySource;
  const selectedFeed = (searchParams.get('feed') as 'global' | 'following') || 'global';

  const globalFeed = useGlobalFeed({ urlType: selectedUrlType, source: selectedSource });
  const followingFeed = useFollowingFeed({ urlType: selectedUrlType, source: selectedSource });

  // Use the appropriate feed based on selection
  const activeFeed = selectedFeed === 'following' ? followingFeed : globalFeed;

  const {
    data,
    error,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
    refetch,
  } = activeFeed;

  const allActivities =
    data?.pages.flatMap((page) => page.activities ?? []) ?? [];

  const handleFeedChange = (value: string | null) => {
    if (!value) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('feed', value);
    router.push(`?${params.toString()}`);
  };

  if (isPending) {
    return <MyFeedContainerSkeleton />;
  }

  if (error) {
    return <MyFeedContainerError />;
  }

  return (
    <Container p="xs" size="xl">
      <Stack align="center">
        <Tabs value={selectedFeed} onChange={handleFeedChange} w="100%">
          <Tabs.List>
            <Tabs.Tab value="global" fw={600}>
              Global
            </Tabs.Tab>
            <Tabs.Tab value="following" fw={600}>
              Following
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>
        {isRefetching && (
          <Stack align="center" gap={'xs'}>
            <Loader color={'gray'} />
            <Text fw={600} c={'gray'}>
              Fetching the latest activities...
            </Text>
          </Stack>
        )}
        {allActivities.length === 0 ? (
          <Center>
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
