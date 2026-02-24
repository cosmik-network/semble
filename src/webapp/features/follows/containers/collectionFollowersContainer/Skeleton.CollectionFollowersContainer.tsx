import CollectionCardSkeleton from '@/features/collections/components/collectionCard/Skeleton.CollectionCard';
import { Container, SimpleGrid } from '@mantine/core';

export default function CollectionFollowersContainerSkeleton() {
  return (
    <Container p={'xs'} size={'xl'}>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="xs">
        {Array.from({ length: 4 }).map((_, i) => (
          <CollectionCardSkeleton key={i} />
        ))}
      </SimpleGrid>
    </Container>
  );
}
