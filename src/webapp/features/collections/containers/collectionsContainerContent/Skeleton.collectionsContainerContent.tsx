import { Stack, SimpleGrid } from '@mantine/core';
import CollectionCardSkeleton from '../../components/collectionCard/Skeleton.CollectionCard';

export default function CollectionsContainerContentSkeleton() {
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
