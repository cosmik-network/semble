'use client';

import { ActionIcon, Box } from '@mantine/core';
import { useWindowScroll, useDebouncedCallback } from '@mantine/hooks';
import { LuRefreshCcw } from 'react-icons/lu';
import { FLOATING_BOTTOM_OFFSET } from '@/lib/consts/layout';

const DEBOUNCE_MS = 500;

interface Props {
  onRefetch: () => void;
}

export default function RefetchButton(props: Props) {
  const [_scroll, scrollTo] = useWindowScroll();

  const debouncedRefetch = useDebouncedCallback(props.onRefetch, DEBOUNCE_MS);

  return (
    <Box
      pos={'fixed'}
      bottom={0}
      mt={'md'}
      mx={{ base: 10, sm: 2.5 }}
      mb={FLOATING_BOTTOM_OFFSET}
      style={{ zIndex: 2 }}
    >
      <ActionIcon
        size="input-lg"
        radius="xl"
        variant="default"
        c="gray"
        onClick={() => {
          debouncedRefetch();
          scrollTo({ y: 0 });
        }}
      >
        <LuRefreshCcw size={22} />
      </ActionIcon>
    </Box>
  );
}
