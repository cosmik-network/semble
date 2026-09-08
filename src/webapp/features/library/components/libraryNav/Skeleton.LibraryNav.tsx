import { Skeleton, Stack, Text } from '@mantine/core';

export default function LibraryNavSkeleton() {
  return (
    <Stack gap={'xs'}>
      <Text fz={'sm'} fw={600} c={'gray'}>
        Library
      </Text>

      <Stack gap={5} my={'sm'}>
        <Skeleton h={40} w={'100%'} />
        <Skeleton h={40} w={'100%'} />
        <Skeleton h={40} w={'100%'} />
        <Skeleton h={40} w={'100%'} />
      </Stack>
    </Stack>
  );
}
