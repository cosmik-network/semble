import { AppShellAside, Stack, Text } from '@mantine/core';
import UrlCardSkeleton from '@/features/cards/components/urlCard/Skeleton.UrlCard';

export default function SembleAsideSkeleton() {
  return (
    <AppShellAside p={'sm'}>
      <Stack gap={'xs'}>
        <Text fz={'xl'} fw={600}>
          Added recently by
        </Text>
        <Stack gap={'xs'}>
          <UrlCardSkeleton />
          <UrlCardSkeleton />
          <UrlCardSkeleton />
        </Stack>
      </Stack>
    </AppShellAside>
  );
}
