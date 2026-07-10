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
import { trailCollection } from '../mockData';

const CARD_WIDTH = 90;

/**
 * Decorative collection card for the "Find related collections" trail stop.
 * Mirrors the layout of `orbitalHero/HeroCollectionCard`, showing each essay's
 * real og:image preview and falling back to the title text (like
 * CollectionCardPreview) if an image fails to load.
 */
export default function TrailCollectionCard() {
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  return (
    <Card withBorder radius="lg" p="sm">
      <Stack gap="xs">
        <Stack gap={0}>
          <Text c="dimmed" fz="sm" lineClamp={1}>
            {trailCollection.name}
          </Text>
          <Text fw={600} lineClamp={1}>
            {trailCollection.subtitle}
          </Text>
        </Stack>

        <Group gap="xs" grow wrap="nowrap">
          {trailCollection.cards.map((c) => (
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

        <Group justify="space-between" gap="xs">
          <Text c="gray" fz="sm">
            {trailCollection.cardCount} cards
          </Text>
          <Text c="gray" fz="sm">
            {trailCollection.updatedAt}
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}
