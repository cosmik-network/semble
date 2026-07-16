import { Card, Skeleton, Stack } from '@mantine/core';
import CollectionCardPreviewSkeleton from '../collectionCardPreview/Skeleton.CollectionCardPreview';

export default function CollectionCardSkeleton() {
  return (
    <Card withBorder radius={'lg'} p={'sm'}>
      <Stack justify="space-between" h={'100%'} gap={'lg'}>
        <Stack gap={5}>
          {/* Title */}
          <Skeleton w={'100%'} h={14} />
          {/* Description */}
          <Stack gap={5}>
            <Skeleton w={'100%'} h={14} />
          </Stack>
          {/* Preview strip — single source of truth with the loaded card */}
          <CollectionCardPreviewSkeleton />
        </Stack>
        {/* Collection metadata */}
        <Skeleton w={'80%'} h={16} />
      </Stack>
    </Card>
  );
}
