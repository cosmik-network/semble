import { Stack, Avatar, Skeleton } from '@mantine/core';

export default function AccountSummarySkeleton() {
  return (
    <Stack align="center">
      <Avatar size={'xl'} radius={'lg'} />
      <Stack gap={'xs'} align="center">
        <Skeleton w={100} h={28} />
        <Skeleton w={80} h={18} />
      </Stack>
    </Stack>
  );
}
