import { AspectRatio, Box, Card, Group, Stack, Text } from '@mantine/core';
import { heroCollection } from './mockData';

// Mirrors CollectionCardPreview's thumbnail row (110px wide, 16:9) but with
// static gradient tiles instead of a live-fetched card preview.
const THUMBS = [
  'linear-gradient(135deg, #4098FF 0%, #1e4dd9 100%)',
  'linear-gradient(135deg, #E8352E 0%, #B01B15 100%)',
  'linear-gradient(135deg, #F7B733 0%, #9C36B5 60%, #2F9E44 100%)',
];

const CARD_WIDTH = 110;

/**
 * Static stand-in for the real CollectionCard. The real one fetches its
 * thumbnail row via TanStack Query, which we don't want firing on the public
 * landing page, so this reproduces the layout with mock data.
 */
export default function HeroCollectionCard() {
  return (
    <Card withBorder radius="lg" p="sm">
      <Stack gap="xs">
        <Text fw={500} c="green" lineClamp={1}>
          {heroCollection.name}
        </Text>

        <Group gap="xs" grow wrap="nowrap">
          {THUMBS.map((bg) => (
            <Box key={bg} w={CARD_WIDTH} miw={CARD_WIDTH}>
              <AspectRatio ratio={16 / 9}>
                <Box style={{ background: bg, borderRadius: 'var(--mantine-radius-md)' }} />
              </AspectRatio>
            </Box>
          ))}
        </Group>

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
