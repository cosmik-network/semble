'use client';

import { ActionIcon } from '@mantine/core';
import { useWindowScroll, useDebouncedCallback } from '@mantine/hooks';
import { LuRefreshCcw } from 'react-icons/lu';

interface Props {
  onRefetch: () => void;
}

export default function RefetchButton(props: Props) {
  const [_scroll, scrollTo] = useWindowScroll();
  const DEBOUNCE_MS = 500;

  // debounce the refetch so it only runs after user stops clicking for DEBOUNCE_MS
  const debouncedRefetch = useDebouncedCallback(() => {
    props.onRefetch();
  }, DEBOUNCE_MS);

  return (
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
  );
}
