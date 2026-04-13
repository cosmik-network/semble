import SimilarCardsContainerSkeleton from '@/features/cards/containers/similarCardsContainer/Skeleton.SimilarCardsContainer';
import { Container } from '@mantine/core';

export default function Loading() {
  return (
    <Container p="xs" size="xl">
      <SimilarCardsContainerSkeleton />
    </Container>
  );
}
