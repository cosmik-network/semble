import { Button, Skeleton, Stack } from '@mantine/core';
import { MdOutlineStickyNote2 } from 'react-icons/md';
import { COLLECTION_PANEL_HEIGHT } from './CollectionListScrollArea';

// Mirrors the loaded layout of AddCardToModalContent (note actions, tabs,
// tab panel, action buttons) so the modal keeps its height while loading.
export default function CollectionSelectorSkeleton() {
  return (
    <Stack gap={'md'}>
      {/* Wraps the real button so the placeholder can't drift from
          AddCardActions' collapsed state in size or radius */}
      <Skeleton w={'fit-content'} radius={'xl'}>
        <Button
          variant="light"
          size="xs"
          color="gray"
          leftSection={<MdOutlineStickyNote2 />}
        >
          Add note
        </Button>
      </Skeleton>
      <Stack gap={'xs'}>
        <Skeleton w={'100%'} h={40} />
        <Skeleton w={'100%'} h={COLLECTION_PANEL_HEIGHT} />
      </Stack>
      <Skeleton w={'100%'} h={42} mt={'md'} radius={'xl'} />
    </Stack>
  );
}
