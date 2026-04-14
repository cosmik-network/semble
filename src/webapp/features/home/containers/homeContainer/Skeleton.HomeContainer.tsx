import { Container, Stack } from '@mantine/core';
import RecentCardsSkeleton from '../../components/recentCards/Skeleton.RecentCards';
import RecentCollectionsSkeleton from '../../components/recentCollections/Skeleton.RecentCollections';
import DiscoverOnSembleSkeleton from '../../components/discoverOnSemble/Skeleton.DiscoverOnSemble';

export default function HomeContainerSkeleton() {
  return (
    <Container p="xs" size="xl">
      <Stack>
        <Stack gap={50}>
          <DiscoverOnSembleSkeleton />
          <RecentCollectionsSkeleton />
          <RecentCardsSkeleton />
        </Stack>
      </Stack>
    </Container>
  );
}
