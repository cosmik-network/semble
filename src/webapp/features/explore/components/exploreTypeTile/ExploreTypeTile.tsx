'use client';

import { Card, Stack, Text } from '@mantine/core';
import { createElement } from 'react';
import { getUrlTypeIcon } from '@/lib/utils/icon';
import { FeedDestination } from '../../lib/feedDestinations';
import { useFeedDestination } from '../../lib/useFeedDestination';

interface Props {
  destination: FeedDestination;
}

export default function ExploreTypeTile(props: Props) {
  const { select } = useFeedDestination();
  // `createElement` rather than aliasing to `<Icon />`: assigning a component
  // to a capitalized local during render trips react-hooks/static-components.
  const icon = createElement(
    getUrlTypeIcon(props.destination.urlType ?? undefined),
    { size: 22 },
  );

  // Same lime `variant="light"` treatment the url-type filters use
  // (CardFilters / FeedFilters / FeedControls), applied to the whole tile.
  return (
    <Card
      component="button"
      type="button"
      radius="lg"
      p="md"
      h="100%"
      w="100%"
      ta="left"
      // `component="button"` otherwise keeps the browser's default
      // `2px outset` button border, which Card only overrides via withBorder.
      bd="none"
      bg="var(--mantine-color-lime-light)"
      c="var(--mantine-color-lime-light-color)"
      style={{ cursor: 'pointer' }}
      onClick={() => select(props.destination)}
    >
      <Stack gap={10} justify="center" h="100%">
        {icon}
        <Text fz="md" fw={600}>
          {props.destination.label}
        </Text>
      </Stack>
    </Card>
  );
}
