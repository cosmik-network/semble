import { Skeleton, Stack } from '@mantine/core';
import { COLLECTION_PANEL_HEIGHT } from './CollectionListScrollArea';

export default function CollectionSelectorSkeleton() {
  return (
    <Stack gap={'md'}>
      <Stack gap={'xs'}>
        <Skeleton w={'100%'} h={40} />
        <Skeleton w={'100%'} h={COLLECTION_PANEL_HEIGHT} />
      </Stack>
      <Skeleton w={'100%'} h={42} mt={'md'} radius={'xl'} />
    </Stack>
  );
}
