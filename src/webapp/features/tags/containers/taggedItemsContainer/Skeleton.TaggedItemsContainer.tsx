import UrlCardSkeleton from '@/features/cards/components/urlCard/Skeleton.UrlCard';
import { Stack } from '@mantine/core';

export default function TaggedItemsContainerSkeleton() {
  return (
    <Stack gap="xs">
      {Array.from({ length: 4 }).map((_, i) => (
        <UrlCardSkeleton key={i} />
      ))}
    </Stack>
  );
}
