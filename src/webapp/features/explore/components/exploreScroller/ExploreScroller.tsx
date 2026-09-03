'use client';

import { Box, Group, Scroller } from '@mantine/core';
import { Children, ReactNode, useState } from 'react';
import styles from './ExploreScroller.module.css';

export const COLLECTION_TILE_WIDTH = 420;

interface Props {
  children: ReactNode;
  /** Tile width in px; capped to the viewport so wide tiles fit a phone. */
  itemWidth?: number;
  /** Animate the tiles in as they mount. Off for first paint and skeletons. */
  animateOnMount?: boolean;
  /** Fade the row out while a new set is loading. */
  dimmed?: boolean;
}

/**
 * Horizontal row of fixed-width tiles, shared by the explore sections.
 *
 * Give it a `key` that changes with the set to replay the entrance: React
 * replaces the row, and its tiles mount again.
 */
export default function ExploreScroller(props: Props) {
  const itemWidth = props.itemWidth ?? 300;
  // Read once: a later flip must not restart the animation on tiles already
  // on screen. The next set mounts under a new key and reads it afresh.
  const [animate] = useState(props.animateOnMount);

  return (
    <Scroller scrollAmount={itemWidth + 20}>
      <Group
        wrap="nowrap"
        align="stretch"
        gap="xs"
        className={props.dimmed ? `${styles.row} ${styles.dimmed}` : styles.row}
      >
        {Children.map(props.children, (child, index) => (
          <Box
            className={
              animate ? `${styles.item} ${styles.animateIn}` : styles.item
            }
            style={{
              width: itemWidth,
              // Keeps a wide tile from running past a phone screen, while
              // still leaving a sliver of the next one visible.
              maxWidth: '85vw',
              animationDelay: `${index * 70}ms`,
            }}
          >
            {child}
          </Box>
        ))}
      </Group>
    </Scroller>
  );
}
