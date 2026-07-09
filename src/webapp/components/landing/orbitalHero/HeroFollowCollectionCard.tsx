import { Button, Card, Group, Stack, Text } from '@mantine/core';
import { followedCollection } from './mockData';

/**
 * Compact static "collection you follow" card. Intentionally simpler than
 * HeroCollectionCard (no thumbnail row) so the two collection cards in the
 * orbital hero don't read as duplicates. The Following button is decorative
 * (component="div") — the landing page must not trigger the real FollowButton's
 * queries/mutations.
 */
export default function HeroFollowCollectionCard() {
  return (
    <Card withBorder radius="lg" p="sm">
      <Stack gap="xs">
        <Text fw={500} c="green" lineClamp={1}>
          {followedCollection.name}
        </Text>

        <Group justify="space-between" gap="sm" wrap="nowrap">
          <Text c="gray" fz="sm">
            {followedCollection.cardCount} cards
          </Text>

          <Button
            component="div"
            variant="light"
            color="gray"
            radius="xl"
            size="xs"
            style={{ flexShrink: 0 }}
          >
            Following
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
