import { SimpleGrid } from '@mantine/core';
import CollectionCardSkeleton from '../../components/collectionCard/Skeleton.CollectionCard';

export default function OpenCollectionsContainerContentSkeleton() {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xs">
      {Array.from({ length: 3 }).map((_, i) => (
        <CollectionCardSkeleton key={i} />
      ))}
    </SimpleGrid>
  );
}
