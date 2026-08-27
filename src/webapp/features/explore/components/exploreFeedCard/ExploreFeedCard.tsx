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
      bd="none"
      bg={CARD_BG}
      style={{ cursor: 'pointer' }}
      onClick={() => select(props.destination)}
    >
      <Stack flex={1} justify="space-between">
        {props.icon}
        <Stack gap="xs">
          <Text
            fz={isHero ? { base: 26, sm: 36 } : { base: 'md', sm: 'lg' }}
            fw={600}
            c="bright"
          >
            {props.destination.label}
          </Text>
          <Text
            fz={isHero ? 'lg' : { base: 'sm', sm: 'md' }}
            fw={500}
            c="dimmed"
          >
            {props.destination.description}
          </Text>
        </Stack>
      </Stack>
    </Card>
  );
}
