import { AspectRatio, Card, Skeleton, Stack } from '@mantine/core';

export default function CanvasCardSkeleton() {
  return (
    <Card withBorder radius={'lg'} p={'sm'}>
      <Stack gap={'sm'}>
        {/* Thumbnail */}
        <AspectRatio ratio={16 / 10}>
          <Skeleton radius={'md'} />
        </AspectRatio>
        <Stack gap={5}>
          {/* Name */}
          <Skeleton w={'60%'} h={14} />
          {/* Canvas metadata */}
          <Skeleton w={'40%'} h={14} />
        </Stack>
      </Stack>
    </Card>
  );
}
