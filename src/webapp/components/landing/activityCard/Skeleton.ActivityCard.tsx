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
    <Stack component="article" gap={5} justify="stretch" h={'100%'}>
      <Card withBorder radius={'lg'} p={'sm'} flex={1}>
        <Stack justify="space-between" flex={1}>
          <Group justify="space-between" align="start" gap={'lg'}>
            <Stack gap={'xs'} flex={1}>
              <Stack gap={5}>
                {/* Domain */}
                <Skeleton w={80} h={21} />
                {/* Title */}
                <Skeleton w={'100%'} h={25} />
              </Stack>

              {/* Description */}
              <Stack gap={5}>
                <Skeleton w={'100%'} h={16} />
                <Skeleton w={'100%'} h={16} />
                <Skeleton w={'100%'} h={16} />
              </Stack>
            </Stack>

            <AspectRatio ratio={1 / 1}>
              <Skeleton w={75} h={75} />
            </AspectRatio>
          </Group>

          {/* Url card actions */}
          <Group justify="space-between">
            <Group gap={'xs'}>
              <Skeleton w={60} h={26} radius={'xl'} />
              <Skeleton w={54} h={26} radius={'xl'} />
            </Group>
            <Skeleton w={26} h={26} circle />
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
}
