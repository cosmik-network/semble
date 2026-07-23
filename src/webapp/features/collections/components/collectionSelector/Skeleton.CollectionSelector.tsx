import { Skeleton, Stack } from '@mantine/core';
import { COLLECTION_PANEL_HEIGHT } from './CollectionListScrollArea';

// Mirrors the loaded layout of AddCardToModalContent (note actions, tabs,
// tab panel, action buttons) so the modal keeps its height while loading.
export default function CollectionSelectorSkeleton() {
  return (
    <Stack gap={'md'}>
      <Skeleton w={140} h={30} radius={'xl'} />
      <Stack gap={'xs'}>
        <Skeleton w={'100%'} h={40} />
        <Skeleton w={'100%'} h={COLLECTION_PANEL_HEIGHT} />
      </Stack>
      <Skeleton w={'100%'} h={42} mt={'md'} radius={'xl'} />
    </Stack>
  );
}
