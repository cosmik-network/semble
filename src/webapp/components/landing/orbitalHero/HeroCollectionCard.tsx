'use client';

import {
  AspectRatio,
  Box,
  Card,
  Center,
  Group,
  Image,
  Stack,
  Text,
} from '@mantine/core';
import { useState } from 'react';
import { BiWorld } from 'react-icons/bi';
import { getDomain } from '@/lib/utils/link';
import { heroCollection, heroCollectionCards } from './mockData';

const CARD_WIDTH = 110;

/**
 * Static stand-in for the real CollectionCard. The real one fetches its
 * thumbnail row via TanStack Query, which we don't want firing on the public
 * landing page, so this reproduces the layout with mock data — showing each
 * essay's real og:image with its domain and title below (like
 * CollectionCardPreview) and falling back to a globe icon if an image fails to
 * load.
 */
export default function HeroCollectionCard() {
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  return (
    <Card withBorder radius="lg" p="sm">
      <Stack gap="xs">
        <Text fw={500} c="green" lineClamp={1}>
          {heroCollection.name}
        </Text>

        {/* contain: inline-size zeroes this row's min-content contribution —
            without it the fixed 110px thumbnails force the whole page wider
            than small viewports (the ancestor Stacks are shrink-to-fit). */}
        <Box style={{ overflow: 'hidden', contain: 'inline-size' }}>
          <Group gap="xs" grow wrap="nowrap" align="start">
            {heroCollectionCards.map((c) => (
              <Box key={c.url} w={CARD_WIDTH} miw={CARD_WIDTH}>
                <AspectRatio ratio={16 / 9}>
                  {c.imageUrl && !failed[c.url] ? (
                    <Image
                      src={c.imageUrl}
                      alt={`${c.title} preview image`}
                      radius="md"
                      fit="cover"
                      draggable={false}
                      onError={() =>
                        setFailed((prev) => ({ ...prev, [c.url]: true }))
                      }
                    />
                  ) : (
                    <Card p="xs" radius="md" withBorder>
                      <Center my="auto">
                        <BiWorld
                          size={24}
                          color="var(--mantine-color-dimmed)"
                        />
                      </Center>
                    </Card>
                  )}
                </AspectRatio>
                <Stack gap={0} mt={6}>
                  <Text c="gray" fz={11} lineClamp={1}>
                    {getDomain(c.url)}
                  </Text>
                  <Text c="bright" fz={12} fw={500} lineClamp={2}>
                    {c.title}
                  </Text>
                </Stack>
              </Box>
            ))}
          </Group>
        </Box>

        <Group justify="space-between" gap="xs">
          <Text c="gray" fz="sm">
            {heroCollection.cardCount} cards
          </Text>
          <Text c="gray" fz="sm">
            {heroCollection.updatedAt}
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}
