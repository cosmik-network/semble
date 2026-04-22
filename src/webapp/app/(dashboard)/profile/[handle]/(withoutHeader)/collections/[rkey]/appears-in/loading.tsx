import SembleCollectionsContainerSkeleton from '@/features/semble/containers/sembleCollectionsContainer/Skeleton.SembleCollectionsContainer';
import { Container } from '@mantine/core';

export default function Loading() {
  return (
    <Container p="xs" size="xl">
      <SembleCollectionsContainerSkeleton />
    </Container>
  );
}
