import { Container, Group, SimpleGrid, Skeleton, Stack } from '@mantine/core';
import CollectionCardSkeleton from '../../components/collectionCard/Skeleton.CollectionCard';

export default function CollectionsContainerSkeleton() {
  return (
    <Container p="xs" size="xl">
      <Stack gap={'xs'}>
        <Group gap={'xs'} justify="space-between">
          <Skeleton w={96} h={36} radius={'xl'} />
          <Skeleton w={160} h={36} radius={'xl'} />
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="xs">
          {Array.from({ length: 4 }).map((_, i) => (
            <CollectionCardSkeleton key={i} />
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
