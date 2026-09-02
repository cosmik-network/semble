import { Container, Stack } from '@mantine/core';
import ExploreCardsSkeleton from '../../components/exploreCards/Skeleton.ExploreCards';
import ExploreCollectionsSkeleton from '../../components/exploreCollections/Skeleton.ExploreCollections';
import ExploreProfilesSkeleton from '../../components/exploreProfiles/Skeleton.ExploreProfiles';

export default function ExploreContainerSkeleton() {
  return (
    <Container p="xs" size="xl">
      <Stack gap={80}>
        <ExploreCardsSkeleton />
        <ExploreCollectionsSkeleton />
        <ExploreProfilesSkeleton />
      </Stack>
    </Container>
  );
}
