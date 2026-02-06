import { Container, Group, Select, SimpleGrid, Stack } from '@mantine/core';
import CollectionCardSkeleton from '../../components/collectionCard/Skeleton.CollectionCard';

export default function OpenCollectionContainerSkeleton() {
  return (
    <Container p="xs" size="xl">
      <Stack>
        <Group justify="space-between" gap={'xs'}>
          <Select disabled w={140} mr={'auto'} variant="filled" size="sm" />
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
