import { Card, Skeleton, Stack } from '@mantine/core';

export default function NoteCardSkeleton() {
  return (
    <Card p={'sm'} withBorder>
      <Stack gap={'xs'}>
        {/* Note */}
        <Stack gap={5}>
          <Skeleton w={'100%'} h={14} />
          <Skeleton w={'100%'} h={14} />
          <Skeleton w={'100%'} h={14} />
        </Stack>

        {/* Updated at */}
        <Skeleton w={80} h={14} />
      </Stack>
    </Card>
  );
}
