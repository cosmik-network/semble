'use client';

import { Group, Text } from '@mantine/core';
import { FaBluesky } from 'react-icons/fa6';

/**
 * Deliberately not a Mantine palette colour: the theme overrides `blue` with a
 * cyan of its own, so `color="blue"` renders something recognisably not
 * Bluesky. Already inlined the same way in `BlueskyPlatformIcon`.
 */
const BLUESKY_BLUE = '#0085ff';

interface Props {
  /** "Followed on Bluesky" / "Author followed on Bluesky". */
  children: string;
}

export default function BlueskyNote(props: Props) {
  return (
    <Group gap={5} wrap="nowrap" miw={0}>
      <FaBluesky
        fill={BLUESKY_BLUE}
        size={13}
        style={{ flexShrink: 0 }}
        aria-hidden="true"
      />
      <Text fz={'xs'} fw={600} c={BLUESKY_BLUE} lineClamp={1}>
        {props.children}
      </Text>
    </Group>
  );
}
