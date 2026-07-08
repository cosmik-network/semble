import { AspectRatio, Box, Card, Group, Stack, Text } from '@mantine/core';
import { trailCollection } from '../mockData';

const CARD_WIDTH = 90;

/**
 * Decorative collection card for the "Find related collections" trail stop.
 * Mirrors the layout of `orbitalHero/HeroCollectionCard` with static gradient
 * thumbnail tiles instead of a live-fetched preview.
 */
export default function TrailCollectionCard() {
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
          {trailCollection.thumbs.map((bg) => (
            <Box key={bg} w={CARD_WIDTH} miw={CARD_WIDTH}>
              <AspectRatio ratio={16 / 9}>
                <Box
                  style={{
                    background: bg,
                    borderRadius: 'var(--mantine-radius-md)',
                  }}
                />
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
