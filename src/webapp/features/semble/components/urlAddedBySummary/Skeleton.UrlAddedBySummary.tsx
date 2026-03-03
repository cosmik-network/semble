import { Avatar, Group, Skeleton } from '@mantine/core';

export default function UrlAddedBySummarySkeleton() {
  return (
    <Group gap={'xs'}>
      <Avatar src={null} size={'sm'} />
      <Skeleton w={'30%'} h={14} />
    </Group>
  );
}
