import { Avatar, Card, Group, Skeleton, Stack } from '@mantine/core';

export default function ProfileCardSkeleton() {
  return (
    <Card withBorder radius={'lg'} p={'sm'} h={'100%'}>
      <Stack gap={'xs'} flex={1}>
        <Group gap={'xs'} wrap="nowrap">
          <Avatar />

          <Stack gap={5} flex={1}>
            <Skeleton w={'10%'} h={14} />
            <Skeleton w={'20%'} h={14} />
          </Stack>
        </Group>

        {/* Description */}
        <Stack gap={5}>
          <Skeleton w={'100%'} h={14} />
          <Skeleton w={'100%'} h={14} />
        </Stack>
      </Stack>
    </Card>
  );
}
