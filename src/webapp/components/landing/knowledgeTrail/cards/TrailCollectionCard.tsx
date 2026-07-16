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
import { trailCollection } from '../mockData';

const CARD_WIDTH = 90;

/**
 * Decorative collection card for the "Find related collections" trail stop.
 * Mirrors the layout of `orbitalHero/HeroCollectionCard`, showing each essay's
 * real og:image preview with its domain and title below (like
 * CollectionCardPreview) and falling back to a globe icon if an image fails to
 * load.
 */
export default function TrailCollectionCard() {
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  return (
    <Card
      withBorder
      radius="lg"
      p="sm"
      style={{ boxShadow: '0 8px 24px -12px rgba(0, 0, 0, 0.25)' }}
    >
      <Stack gap="xs">
        <Stack gap={0}>
          <Text c="dimmed" fz="sm" lineClamp={1}>
            {trailCollection.name}
          </Text>
          <Text fw={600} lineClamp={1}>
            {trailCollection.subtitle}
          </Text>
        </Stack>

        <Group gap="xs" grow wrap="nowrap" align="start">
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
                      <BiWorld size={20} color="var(--mantine-color-dimmed)" />
                    </Center>
                  </Card>
                )}
              </AspectRatio>
              <Stack gap={0} mt={6}>
                <Text c="gray" fz={10} lineClamp={1}>
                  {getDomain(c.url)}
                </Text>
                <Text c="bright" fz={11} fw={500} lineClamp={2}>
                  {c.title}
                </Text>
              </Stack>
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
