import { Container, Group, Skeleton, Stack } from '@mantine/core';
import CollectionContainerContentSkeleton from '../collectionContainerContent/Skeleton.CollectionContainerContent';

export default function CollectionContainerSkeleton() {
  return (
    <Container p="xs" size="xl">
      <Stack gap={'lg'}>
        <Group justify="space-between" gap={'xs'}>
          {/* Card Filters */}
          <Group gap={'xs'}>
            <Skeleton w={120} h={36} radius={'md'} />
          </Group>
        </Group>

        {/* Cards Content */}
        <CollectionContainerContentSkeleton />
      </Stack>
    </Container>
  );
}
