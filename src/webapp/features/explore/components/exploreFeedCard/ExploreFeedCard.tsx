'use client';

import { Card, Stack, Text } from '@mantine/core';
import { ReactNode } from 'react';
import { FeedDestination } from '../../lib/feedDestinations';
import { useFeedDestination } from '../../lib/useFeedDestination';

// The same flat neutral the landing page's API/Plugins cards use
// (src/webapp/app/page.tsx) — one fill, no gradient, no per-feed hue.
const CARD_BG =
  'light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-4))';

interface Props {
  destination: FeedDestination;
  icon: ReactNode;
  /** `hero` is the large cell that opens the mosaic. */
  variant?: 'hero' | 'compact';
}

export default function ExploreFeedCard(props: Props) {
  const { select } = useFeedDestination();
  const isHero = props.variant === 'hero';

  return (
    <Card
      component="button"
      type="button"
      radius="lg"
      p={isHero ? { base: 'md', sm: 'lg' } : 'md'}
      // The mosaic is nested flex rows, so each card claims an equal share of
      // its line and sets its own floor. `miw={0}` lets a long label shrink
      // the card rather than push the row wider than its container.
      flex={1}
      miw={0}
      mih={
        isHero
          ? { base: 196, sm: 260 }
          : // A phone stands the compact pair side by side, where the longest
            // description needs three lines; from `sm` the hero sets the
            // height and the pair splits it.
            { base: 138, sm: 0 }
      }
      ta="left"
      // `component="button"` otherwise keeps the browser's default
      // `2px outset` button border; the fill does the separating work.
      bd="none"
      bg={CARD_BG}
      style={{ cursor: 'pointer' }}
      onClick={() => select(props.destination)}
    >
      {/* The landing page's card anatomy: icon at the top, label and
          description together as one group at the bottom, the space between
          them absorbing whatever height the cell has. */}
      {/* `flex={1}` rather than `h="100%"`: the card is a flex column with no
          height of its own now, only a floor, so a percentage has nothing
          definite to resolve against. */}
      <Stack flex={1} justify="space-between">
        {props.icon}
        <Stack gap="xs">
          {/* The compact cells sit two-up on a phone, where the landing
              page's `lg`/`md` pair would wrap every description to three
              lines; they step up to it from `sm`. */}
          <Text
            fz={isHero ? { base: 26, sm: 36 } : { base: 'md', sm: 'lg' }}
            fw={600}
            lh={1.2}
            c="bright"
          >
            {props.destination.label}
          </Text>
          <Text
            fz={isHero ? 'lg' : { base: 'sm', sm: 'md' }}
            fw={500}
            c="dimmed"
            lh={1.4}
          >
            {props.destination.description}
          </Text>
        </Stack>
      </Stack>
    </Card>
  );
}
