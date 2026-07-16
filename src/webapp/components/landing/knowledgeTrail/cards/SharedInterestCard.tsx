import { Avatar, Badge, Card, Group, Stack, Text } from '@mantine/core';
import { interestCurators } from '../mockData';

/**
 * Decorative curator list for the "See who shares your interest" trail stop.
 * Mirrors the URL page's "Added by" tab (ProfileCard rows): avatar, name,
 * @handle, the relative time each curator added the link, and the occasional
 * "Follows you" badge. Presentational only.
 */
export default function SharedInterestCard() {
  return (
    <Card
      withBorder
      radius="lg"
      p={6}
      style={{
        boxShadow: '0 8px 24px -12px rgba(0, 0, 0, 0.25)',
      }}
    >
      <Stack gap={2}>
        {interestCurators.map((curator) => (
          <Group
            key={curator.handle}
            justify="space-between"
            wrap="nowrap"
            gap="sm"
            px="sm"
            py={6}
            align="flex-start"
          >
            <Group gap="sm" wrap="nowrap" style={{ overflow: 'hidden' }}>
              <Avatar
                src={curator.src}
                variant="filled"
                color={curator.color}
                size="md"
                radius="xl"
                alt=""
              >
                {curator.initial}
              </Avatar>
              <Stack gap={0} align="flex-start" style={{ overflow: 'hidden' }}>
                <Text c="bright" fw={600} fz="sm" truncate>
                  {curator.name}
                </Text>
                <Text c="gray" fw={600} fz="xs" truncate>
                  @{curator.handle}
                </Text>
                {curator.followsYou && (
                  <Badge variant="light" color="gray" size="sm" mt={4}>
                    Follows you
                  </Badge>
                )}
              </Stack>
            </Group>
            <Text c="gray" fz="sm" style={{ flexShrink: 0 }}>
              {curator.addedAt}
            </Text>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}
