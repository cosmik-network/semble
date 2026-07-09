import { Avatar, Card, Group, Stack, Text } from '@mantine/core';
import { perspectiveNote } from '../mockData';

/**
 * Decorative note/annotation card for the "Find new perspectives" trail stop.
 */
export default function PerspectiveNoteCard() {
  return (
    <Card withBorder radius="lg" p="md">
      <Stack gap="sm">
        <Text c="bright" fz="sm" lineClamp={4}>
          {perspectiveNote.quote}
        </Text>
        <Group gap="xs" wrap="nowrap">
          <Avatar
            color='grape'
            size="sm"
            radius="md"
          >
            {perspectiveNote.authorInitial}
          </Avatar>
          <Text fw={600} fz="sm">
            {perspectiveNote.author}
          </Text>
          <Text c="dimmed" fz="xs">
            {perspectiveNote.createdAt}
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}
