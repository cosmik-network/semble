import { Container, Stack, Title } from '@mantine/core';
import FeedItemSkeleton from '../../components/feedItem/Skeleton.FeedItem';

export default function MyFeedContainerSkeleton() {
  return (
    <Container p="xs" size="xl">
      <Stack align="center">
        <Title order={1}>Explore</Title>

        <Stack gap={60} mx={'auto'} maw={600} w={'100%'} align="stretch">
          {Array.from({ length: 4 }).map((_, i) => (
            <FeedItemSkeleton key={i} />
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}
