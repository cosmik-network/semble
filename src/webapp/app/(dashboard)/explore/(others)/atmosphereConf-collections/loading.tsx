import AtmosphereConfCollectionsContainerSkeleton from '@/features/collections/containers/atmosphereConfCollectionsContainer/Skeleton.AtmosphereConfCollectionsContainer';
import { Container } from '@mantine/core';

export default function Loading() {
  return (
    <Container p="xs" size="xl">
      <AtmosphereConfCollectionsContainerSkeleton />
    </Container>
  );
}
