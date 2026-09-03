import { SimpleGrid } from '@mantine/core';
import UrlCardSkeleton from '../../components/urlCard/Skeleton.UrlCard';

export default function ExploreCardsSearchContentSkeleton() {
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, lg: 4 }} spacing="xs">
      {Array.from({ length: 8 }).map((_, i) => (
        <UrlCardSkeleton key={i} />
      ))}
    </SimpleGrid>
  );
}
