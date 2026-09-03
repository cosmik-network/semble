'use client';

import { Box, Flex, Stack, Text } from '@mantine/core';
import { ReactNode } from 'react';
import { MdOutlineEmojiNature } from 'react-icons/md';
import { HiGlobeAlt, HiUsers } from 'react-icons/hi';
import { FaBluesky } from 'react-icons/fa6';
import ExploreSectionHeader from '../exploreSectionHeader/ExploreSectionHeader';
import ExploreScroller from '../exploreScroller/ExploreScroller';
import ExploreFeedCard from '../exploreFeedCard/ExploreFeedCard';
import ExploreTypeTile from '../exploreTypeTile/ExploreTypeTile';
import {
  FEED_DESTINATIONS,
  FeedDestinationId,
  TYPE_DESTINATIONS,
} from '../../lib/feedDestinations';

// The cards themselves are one neutral, so the icon is what tells the three
// feeds apart — hence a colour each. Bluesky keeps its brand blue, the same
// literal the platform icon uses. The hero's runs larger, as its type does.
const FEED_ICONS: Record<FeedDestinationId, ReactNode> = {
  'feed-global': <HiGlobeAlt size={40} color="var(--mantine-color-teal-6)" />,
  'feed-following': (
    <HiUsers size={28} color="var(--mantine-color-tangerine-6)" />
  ),
  'feed-bsky-following': <FaBluesky size={28} color="#0085ff" />,
};

// The mosaic is a hero plus a pair, and the pair is what fills the hero's
// height at `sm`. Spelling the arity out as a tuple makes a fourth feed a
// build error rather than a card silently stacked into a third row.
type Feed = (typeof FEED_DESTINATIONS)[number];
const [HERO_DESTINATION, ...REST_DESTINATIONS]: readonly [Feed, Feed, Feed] =
  FEED_DESTINATIONS;

export default function ExploreFeeds() {
  return (
    <Stack>
      <ExploreSectionHeader
        icon={<MdOutlineEmojiNature size={22} />}
        title="Happening now"
        subtitle="Jump into a feed"
      />

      <Flex direction={{ base: 'column', sm: 'row' }} gap="xs">
        <ExploreFeedCard
          destination={HERO_DESTINATION}
          variant="hero"
          icon={FEED_ICONS[HERO_DESTINATION.id]}
        />

        <Flex
          direction={{ base: 'row', sm: 'column' }}
          gap="xs"
          flex={1}
          miw={0}
        >
          {REST_DESTINATIONS.map((destination) => (
            <ExploreFeedCard
              key={destination.id}
              destination={destination}
              icon={FEED_ICONS[destination.id]}
            />
          ))}
        </Flex>
      </Flex>

      <Box mt="sm">
        <Text fz="lg" fw={500} mb="xs">
          Or browse by kind
        </Text>
        <ExploreScroller itemWidth={130}>
          {TYPE_DESTINATIONS.map((destination) => (
            <ExploreTypeTile key={destination.id} destination={destination} />
          ))}
        </ExploreScroller>
      </Box>
    </Stack>
  );
}
