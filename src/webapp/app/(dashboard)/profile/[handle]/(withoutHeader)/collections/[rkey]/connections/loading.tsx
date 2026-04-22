import ConnectionsContainerSkeleton from '@/features/connections/containers/connectionsContainer/Skeleton.ConnectionsContainer';
import { Container } from '@mantine/core';

export default function Loading() {
  return (
    <Container p="xs" size="xl">
      <ConnectionsContainerSkeleton />
    </Container>
  );
}
