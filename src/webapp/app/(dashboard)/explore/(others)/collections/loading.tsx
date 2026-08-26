import ExploreCollectionsContainerSkeleton from '@/features/collections/containers/exploreCollectionsContainer/Skeleton.ExploreCollectionsContainer';
import { Container } from '@mantine/core';

export default function Loading() {
  return (
    <Container p="xs" size="xl">
      <ExploreCollectionsContainerSkeleton />
    </Container>
  );
}
