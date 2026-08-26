import ExploreCardsContainerSkeleton from '@/features/cards/containers/exploreCardsContainer/Skeleton.ExploreCardsContainer';
import { Container } from '@mantine/core';

export default function Loading() {
  return (
    <Container p="xs" size="xl">
      <ExploreCardsContainerSkeleton />
    </Container>
  );
}
