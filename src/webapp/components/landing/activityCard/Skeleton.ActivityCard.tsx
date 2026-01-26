import {
  AspectRatio,
  Avatar,
  Card,
  Group,
  Skeleton,
  Stack,
} from '@mantine/core';

export default function ActivityCardSkeleton() {
  return (
    <Stack gap={'xs'} align="stretch" h={'100%'}>
      <Card p={0}>
        <Group gap={'xs'} wrap="nowrap" justify="space-between" align="center">
          <Group gap={'xs'} wrap="nowrap" w={'100%'}>
            <Avatar size={'sm'} />
            <Skeleton w={'30%'} h={18} />
          </Group>
          <Skeleton w={'10%'} h={15} />
        </Group>
      </Card>

      <Card radius={'lg'} p={'sm'} flex={1} h={'100%'} withBorder>
        <Stack justify="space-between" gap={'sm'} flex={1}>
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
      </Card>
    </Stack>
  );
}
