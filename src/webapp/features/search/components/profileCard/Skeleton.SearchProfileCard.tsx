import { Avatar, Card, Group, Skeleton, Stack } from '@mantine/core';

export default function SearchProfileCardSkeleton() {
  return (
    <Card withBorder radius={'lg'} p={'sm'} h={'100%'}>
      <Stack gap={'md'}>
        <Group gap={'xs'} wrap="nowrap">
          <Avatar />

          <Stack gap={'xs'} flex={1}>
            <Skeleton w={'60%'} h={12} />
            <Skeleton w={'70%'} h={12} />
          </Stack>
        </Group>
        <Stack gap={5}>
          <Skeleton w={'100%'} h={10} />
          <Skeleton w={'100%'} h={10} />
        </Stack>
      </Stack>
    </Card>
  );
}
