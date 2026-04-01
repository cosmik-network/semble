import { Group, Select, SimpleGrid, Skeleton, Stack } from '@mantine/core';
import CollectionCardSkeleton from '../../components/collectionCard/Skeleton.CollectionCard';

export default function OpenCollectionsContainerSkeleton() {
  return (
    <Stack>
      <Group gap={'xs'}>
        <Skeleton w={96} h={36} radius={'xl'} />
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="xs">
        {Array.from({ length: 4 }).map((_, i) => (
          <CollectionCardSkeleton key={i} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
