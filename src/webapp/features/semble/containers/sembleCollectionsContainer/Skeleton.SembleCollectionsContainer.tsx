import { SimpleGrid, Stack } from '@mantine/core';
import CollectionCardSkeleton from '@/features/collections/components/collectionCard/Skeleton.CollectionCard';

export default function SembleCollectionsContainerSkeleton() {
  return (
    <Stack>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="xs">
        {Array.from({ length: 4 }).map((_, i) => (
          <CollectionCardSkeleton key={i} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
