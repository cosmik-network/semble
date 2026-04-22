import SembleMentionsContainerSkeleton from '@/features/semble/containers/sembleMentionsContainer/Skeleton.SembleMentionsContainer';
import { Container } from '@mantine/core';

export default function Loading() {
  return (
    <Container p="xs" size="xl">
      <SembleMentionsContainerSkeleton />
    </Container>
  );
}
