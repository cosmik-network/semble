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
import { heroCollection, heroCollectionCards } from './mockData';

const CARD_WIDTH = 110;

/**
 * Static stand-in for the real CollectionCard. The real one fetches its
 * thumbnail row via TanStack Query, which we don't want firing on the public
 * landing page, so this reproduces the layout with mock data — showing each
 * essay's real og:image and falling back to the title text (like
 * CollectionCardPreview) if an image fails to load.
 */
export default function HeroCollectionCard() {
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  return (
    <Card withBorder radius="lg" p="sm">
      <Stack gap="xs">
        <Text fw={500} c="green" lineClamp={1}>
          {heroCollection.name}
        </Text>

        <Box style={{ overflow: 'hidden' }}>
          <Group gap="xs" grow wrap="nowrap">
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
                        <Text fz={8} fw={500} lineClamp={2}>
                          {c.title}
                        </Text>
                      </Center>
                    </Card>
                  )}
                </AspectRatio>
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
