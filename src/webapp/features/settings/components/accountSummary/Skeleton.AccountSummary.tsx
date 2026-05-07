import { Card, Group, Stack, Skeleton } from '@mantine/core';
import classes from './AccountSummary.module.css';

export default function AccountSummarySkeleton() {
  return (
    <Card p={'sm'} radius={'lg'} classNames={{ root: classes.root }}>
      <Group gap={'xs'}>
        <Skeleton width={56} height={56} radius={'md'} />
        <Stack gap={'xs'}>
          <Stack gap={0}>
            <Skeleton w={120} h={22} />
            <Skeleton w={90} h={22} mt={4} />
          </Stack>
        </Stack>
      </Group>
    </Card>
  );
}
