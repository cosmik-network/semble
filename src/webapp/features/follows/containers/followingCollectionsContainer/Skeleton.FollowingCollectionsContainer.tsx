import CollectionCardSkeleton from '@/features/collections/components/collectionCard/Skeleton.CollectionCard';
import { Stack } from '@mantine/core';

export default function FollowingCollectionsContainerSkeleton() {
  return (
    <Stack gap={'xs'}>
      {Array.from({ length: 3 }).map((_, i) => (
        <CollectionCardSkeleton key={i} />
      ))}
    </Stack>
  );
}
