import { Skeleton, Stack } from '@mantine/core';

export default function LibraryNavSectionSkeleton() {
  return (
    <Stack gap={0} px={'sm'}>
      <Skeleton h={25} my={'xxs'} w={'100%'} />
      <Skeleton h={25} my={'xxs'} w={'100%'} />
    </Stack>
  );
}
