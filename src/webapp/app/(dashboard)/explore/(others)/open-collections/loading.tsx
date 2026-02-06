import OpenCollectionContainerSkeleton from '@/features/collections/containers/openCollectionsContainer/Skeleton.OpenCollectionsContainer';
import { Container } from '@mantine/core';

export default function Loading() {
  return (
    <Container p="xs" size="xl">
      <OpenCollectionContainerSkeleton />
    </Container>
  );
}
