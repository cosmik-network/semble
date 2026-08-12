'use client';

import { Children, type ReactNode } from 'react';
import { Box, Group, Scroller } from '@mantine/core';
import { PANEL_FILL } from '../taskPanel/TaskPanel';

const CARD_WIDTH = 280;

interface Props {
  children: ReactNode;
}

export default function CardScroller(props: Props) {
  return (
    <Scroller w={'100%'} edgeGradientColor={PANEL_FILL}>
      {/* Scroller's content element is `white-space: nowrap`, which every card
          inherits — titles run onto one line and get cut by their lineClamp. */}
      <Group
        wrap="nowrap"
        align="stretch"
        gap={'xs'}
        style={{ whiteSpace: 'normal' }}
      >
        {Children.map(props.children, (child) => (
          <Box w={CARD_WIDTH} style={{ flex: '0 0 auto' }}>
            {child}
          </Box>
        ))}
      </Group>
    </Scroller>
  );
}
