import { AppShellAside, Group, Skeleton, Stack, Text } from '@mantine/core';
import UrlCardSkeleton from '@/features/cards/components/urlCard/Skeleton.UrlCard';

export default function SembleAsideSkeleton() {
  return (
    <AppShellAside p={'sm'}>
      <Stack gap={'xs'}>
        <Group gap={'xs'} justify="space-between">
          <Text fz={'xl'} fw={600}>
            Similar cards
          </Text>
          <Skeleton w={113} h={36} radius={'xl'} />
        </Group>

        <Stack gap={'xs'}>
          <UrlCardSkeleton />
          <UrlCardSkeleton />
          <UrlCardSkeleton />
        </Stack>
      </Stack>
    </AppShellAside>
  );
}
