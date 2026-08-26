import { Box, Group, Scroller } from '@mantine/core';
import { Children, ReactNode } from 'react';
import styles from './ExploreScroller.module.css';

/**
 * Collection tiles carry a preview strip of card thumbnails plus title,
 * author and stats, so they need more room than a single URL card.
 */
export const COLLECTION_TILE_WIDTH = 420;

interface Props {
  children: ReactNode;
  /** Tile width in px; capped to the viewport so wide tiles fit a phone. */
  itemWidth?: number;
  /** Bump to replay the staggered "deal" animation. 0 = no animation. */
  dealKey?: number;
  /** Fade the row out while a new set is loading. */
  dimmed?: boolean;
}

/** Horizontal row of fixed-width tiles, shared by the explore sections. */
export default function ExploreScroller(props: Props) {
  const itemWidth = props.itemWidth ?? 300;
  const animate = !!props.dealKey;

  return (
    <Scroller scrollAmount={itemWidth + 20}>
      <Group
        wrap="nowrap"
        align="stretch"
        gap="xs"
        className={props.dimmed ? styles.dimmed : undefined}
      >
        {Children.map(props.children, (child, index) => (
          <Box
            key={`${props.dealKey ?? 0}-${index}`}
            className={animate ? `${styles.item} ${styles.deal}` : styles.item}
            style={{
              width: itemWidth,
              // Keeps a wide tile from running past a phone screen, while
              // still leaving a sliver of the next one visible.
              maxWidth: '85vw',
              ...(animate ? { animationDelay: `${index * 70}ms` } : {}),
            }}
          >
            {child}
          </Box>
        ))}
      </Group>
    </Scroller>
  );
}
