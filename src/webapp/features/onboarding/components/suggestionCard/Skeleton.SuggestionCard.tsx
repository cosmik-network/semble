import { Card, Group, Skeleton, Stack } from '@mantine/core';

export default function SuggestionCardSkeleton() {
  return (
    <Card withBorder radius={'lg'} p={'md'} h={'100%'}>
      <Group wrap="nowrap" align="center" gap={'sm'}>
        {/* Avatar size="md" */}
        <Skeleton h={38} w={38} circle />

        <Stack gap={6} miw={0} flex={1}>
          <Skeleton h={16} w={'70%'} />
          <Skeleton h={14} w={'45%'} />
        </Stack>

        {/* FollowButton */}
        <Skeleton h={36} w={88} radius={'xl'} style={{ flex: '0 0 auto' }} />
      </Group>

      <Stack gap={6} mt={'sm'}>
        <Skeleton h={13} w={'100%'} />
        <Skeleton h={13} w={'80%'} />
      </Stack>
    </Card>
  );
}
