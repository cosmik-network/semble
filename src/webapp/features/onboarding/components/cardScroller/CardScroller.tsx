'use client';

import { Children, type ReactNode } from 'react';
import { Box, Group, Scroller } from '@mantine/core';
import { PANEL_FILL } from '../taskPanel/TaskPanel';

const CARD_WIDTH = 280;

interface Props {
  /** `UrlCard`s. Each is sized and pinned to its width here. */
  children: ReactNode;
}

/**
 * Scroller, not ScrollArea: it brings the arrow controls, the edge fade and
 * drag-to-scroll, and suppresses the click that would follow a drag.
 */
export default function CardScroller(props: Props) {
  return (
    // The fade defaults to the page colour, which on the panel's fill shows as
    // a lighter band at each end of the row.
    <Scroller w={'100%'} edgeGradientColor={PANEL_FILL}>
      {/* Scroller's content element is `white-space: nowrap`, which every card
          inherits — titles run onto one line and get cut by their lineClamp. */}
      <Group
        wrap="nowrap"
        align="stretch"
        gap={'xs'}
        style={{ whiteSpace: 'normal' }}
      >
        {/* Group would otherwise squash every card to fit the row. */}
        {Children.map(props.children, (child) => (
          <Box w={CARD_WIDTH} style={{ flex: '0 0 auto' }}>
            {child}
          </Box>
        ))}
      </Group>
    </Scroller>
  );
}
