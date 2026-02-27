import { AspectRatio, Group, Skeleton, Stack } from '@mantine/core';

export default function UrlCardContentSkeleton() {
  return (
    <Stack justify="space-between" flex={1}>
      <Group justify="space-between" align="start" gap={'lg'}>
        <Stack gap={'xs'} flex={1}>
          <Stack gap={5}>
            {/* Domain */}
            <Skeleton w={80} h={14} />
            {/* Title */}
            <Skeleton w={'100%'} h={14} />
            <Skeleton w={'100%'} h={14} />
          </Stack>

          {/* Description */}
          <Stack gap={5}>
            <Skeleton w={'100%'} h={10} />
            <Skeleton w={'100%'} h={10} />
            <Skeleton w={'100%'} h={10} />
          </Stack>
        </Stack>

        <AspectRatio ratio={1 / 1}>
          <Skeleton w={75} h={75} />
        </AspectRatio>
      </Group>
    </Stack>
  );
}
