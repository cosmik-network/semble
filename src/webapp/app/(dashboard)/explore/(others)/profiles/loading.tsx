import ExploreProfilesContainerSkeleton from '@/features/profile/containers/exploreProfilesContainer/Skeleton.ExploreProfilesContainer';
import { Container } from '@mantine/core';

export default function Loading() {
  return (
    <Container p="xs" size="xl">
      <ExploreProfilesContainerSkeleton />
    </Container>
  );
}
