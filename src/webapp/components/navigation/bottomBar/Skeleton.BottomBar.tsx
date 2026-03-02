import { AppShellFooter, Group, Skeleton, Stack } from '@mantine/core';

export default function BottomBarSkeleton() {
  return (
    <AppShellFooter px={'sm'} pb={'lg'} py={'xs'} hiddenFrom="sm">
      <Group align="start" justify="space-around" gap={'lg'} h={'100%'}>
        {[...Array(5)].map((_, i) => (
          <Stack gap={5} key={i}>
            <Skeleton height={40} width={40} radius="md" />
            <Skeleton height={14} width={'100%'} />
          </Stack>
        ))}
      </Group>
    </AppShellFooter>
  );
}
